/**
 * Autosave draf tiap 10 detik + outbox. Bila simpan ke server gagal (offline,
 * 5xx), draf masuk outbox dan dikirim ulang pada tick/`kuras` berikutnya.
 * Penyimpanan outbox diinjeksi: IndexedDB di browser, memori di uji.
 */
export const INTERVAL_AUTOSAVE_MS = 10_000;

export interface ItemOutbox<T> {
	kunci: string;
	nilai: T;
	dicatat: number;
}

export interface Outbox<T> {
	taruh(item: ItemOutbox<T>): Promise<void>;
	semua(): Promise<ItemOutbox<T>[]>;
	hapus(kunci: string): Promise<void>;
}

export function outboxMemori<T>(): Outbox<T> {
	const peta = new Map<string, ItemOutbox<T>>();
	return {
		async taruh(i) {
			peta.set(i.kunci, i);
		},
		async semua() {
			return [...peta.values()];
		},
		async hapus(k) {
			peta.delete(k);
		}
	};
}

/** Outbox IndexedDB (hanya browser). Satu entri per kunci draf: versi terbaru menimpa. */
export function outboxIndexedDB<T>(namaDb = 'pasaree-web', namaStore = 'outbox-draf'): Outbox<T> {
	const buka = () =>
		new Promise<IDBDatabase>((ok, gagal) => {
			const r = indexedDB.open(namaDb, 1);
			r.onupgradeneeded = () => r.result.createObjectStore(namaStore, { keyPath: 'kunci' });
			r.onsuccess = () => ok(r.result);
			r.onerror = () => gagal(r.error);
		});
	const jalankan = async <R>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>) => {
		const db = await buka();
		return new Promise<R>((ok, gagal) => {
			const req = fn(db.transaction(namaStore, mode).objectStore(namaStore));
			req.onsuccess = () => ok(req.result);
			req.onerror = () => gagal(req.error);
		});
	};
	return {
		taruh: async (i) => void (await jalankan('readwrite', (s) => s.put(i))),
		semua: () => jalankan('readonly', (s) => s.getAll() as IDBRequest<ItemOutbox<T>[]>),
		hapus: async (k) => void (await jalankan('readwrite', (s) => s.delete(k)))
	};
}

export interface OpsiAutosave<T> {
	kunci: string;
	simpan: (nilai: T) => Promise<void>;
	outbox: Outbox<T>;
	intervalMs?: number;
	jadwal?: (fn: () => void, ms: number) => unknown;
	batal?: (id: unknown) => void;
	sekarang?: () => number;
}

export type StatusSimpan = 'bersih' | 'kotor' | 'menyimpan' | 'tersimpan' | 'tertunda';

export function buatAutosave<T>(o: OpsiAutosave<T>) {
	const interval = o.intervalMs ?? INTERVAL_AUTOSAVE_MS;
	const jadwal = o.jadwal ?? ((fn, ms) => setInterval(fn, ms));
	const batal = o.batal ?? ((id) => clearInterval(id as ReturnType<typeof setInterval>));
	const sekarang = o.sekarang ?? Date.now;
	let terbaru: T | undefined;
	let kotor = false;
	let timer: unknown;
	let sibuk = false;
	let status: StatusSimpan = 'bersih';

	async function kuras() {
		for (const i of await o.outbox.semua()) {
			try {
				await o.simpan(i.nilai);
				await o.outbox.hapus(i.kunci);
			} catch {
				return false;
			}
		}
		return true;
	}

	async function tick() {
		if (sibuk) return;
		sibuk = true;
		try {
			if (kotor && terbaru !== undefined) {
				const nilai = terbaru;
				status = 'menyimpan';
				try {
					await o.simpan(nilai);
					if (terbaru === nilai) kotor = false;
					status = 'tersimpan';
					await o.outbox.hapus(o.kunci);
				} catch {
					await o.outbox.taruh({ kunci: o.kunci, nilai, dicatat: sekarang() });
					kotor = false;
					status = 'tertunda';
				}
			} else if (await kuras()) {
				if (status === 'tertunda') status = 'tersimpan';
			}
		} finally {
			sibuk = false;
		}
	}

	return {
		ubah(nilai: T) {
			terbaru = nilai;
			kotor = true;
			status = 'kotor';
		},
		mulai() {
			if (timer === undefined) timer = jadwal(() => void tick(), interval);
		},
		henti() {
			if (timer !== undefined) batal(timer);
			timer = undefined;
		},
		tick,
		get status() {
			return status;
		}
	};
}
