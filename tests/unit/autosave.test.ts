import { describe, expect, it } from 'vitest';
import { INTERVAL_AUTOSAVE_MS, buatAutosave, outboxMemori } from '../../src/lib/produk/autosave';

function rakit(gagal: { nilai: boolean }) {
	const terkirim: string[] = [];
	const outbox = outboxMemori<string>();
	let tick: (() => void) | undefined;
	let ms = 0;
	const a = buatAutosave<string>({
		kunci: 'draf-1',
		outbox,
		simpan: async (v) => {
			if (gagal.nilai) throw new Error('offline');
			terkirim.push(v);
		},
		jadwal: (fn, m) => {
			tick = fn;
			ms = m;
			return 1;
		},
		batal: () => {
			tick = undefined;
		}
	});
	return { a, outbox, terkirim, jalankan: () => tick?.(), get ms() { return ms; } };
}

describe('autosave draf', () => {
	it('interval baku 10 detik', () => {
		expect(INTERVAL_AUTOSAVE_MS).toBe(10_000);
		const r = rakit({ nilai: false });
		r.a.mulai();
		expect(r.ms).toBe(10_000);
	});
	it('hanya menyimpan bila ada perubahan', async () => {
		const r = rakit({ nilai: false });
		await r.a.tick();
		expect(r.terkirim).toEqual([]);
		r.a.ubah('v1');
		await r.a.tick();
		await r.a.tick();
		expect(r.terkirim).toEqual(['v1']);
		expect(r.a.status).toBe('tersimpan');
	});
	it('gagal simpan masuk outbox lalu terkirim ulang saat kembali online', async () => {
		const gagal = { nilai: true };
		const r = rakit(gagal);
		r.a.ubah('v1');
		await r.a.tick();
		expect(r.a.status).toBe('tertunda');
		expect((await r.outbox.semua()).map((i) => i.nilai)).toEqual(['v1']);
		gagal.nilai = false;
		await r.a.tick();
		expect(r.terkirim).toEqual(['v1']);
		expect(await r.outbox.semua()).toEqual([]);
	});
	it('versi terbaru menimpa entri outbox yang sama', async () => {
		const r = rakit({ nilai: true });
		r.a.ubah('v1');
		await r.a.tick();
		r.a.ubah('v2');
		await r.a.tick();
		expect((await r.outbox.semua()).map((i) => i.nilai)).toEqual(['v2']);
	});
	it('henti membatalkan penjadwalan', () => {
		const r = rakit({ nilai: false });
		r.a.mulai();
		r.a.henti();
		expect(r.jalankan()).toBeUndefined();
	});
});
