/** Aturan antrean kurasi, keputusan, dan komisi admin (SOP §4, piagam §6-§7, kontrak §6). */

export const AMBANG_NOTIFIKASI_ANTREAN = 50;
export const MAKS_CATATAN = 280;
export const MIN_HARI_BERLAKU_KOMISI = 14;

export interface ItemAntrean {
	produk_id: string;
	judul: string;
	umur_antrean_jam: number;
	prioritas_pangan_segar: boolean;
}

/** FIFO (paling lama dulu) dengan pangan segar didahulukan. Stabil; tidak mengubah masukan. */
export function urutkanAntrean(a: readonly ItemAntrean[]): ItemAntrean[] {
	return a
		.map((x, i) => ({ x, i }))
		.sort(
			(p, q) =>
				Number(q.x.prioritas_pangan_segar) - Number(p.x.prioritas_pangan_segar) ||
				q.x.umur_antrean_jam - p.x.umur_antrean_jam ||
				p.i - q.i
		)
		.map((e) => e.x);
}

/** Antrean LEBIH dari 50 item memicu notifikasi ke ketua TownHall (tepat 50 tidak). */
export function perluNotifikasiKetua(jumlah: number): boolean {
	return jumlah > AMBANG_NOTIFIKASI_ANTREAN;
}

export type Keputusan = 'SETUJU' | 'REVISI' | 'TOLAK';

export const ALASAN_BAKU = [
	{ kode: 'FOTO_TIDAK_ASLI', label: 'Foto tidak asli' },
	{ kode: 'HARGA_TIDAK_WAJAR', label: 'Harga tidak wajar' },
	{ kode: 'LABEL_KURANG', label: 'Label kurang lengkap' }
] as const;

export interface InputKeputusan {
	keputusan: Keputusan | '';
	alasan_baku?: string;
	catatan?: string;
}

/** Galat per kolom; kosong = sah. REVISI/TOLAK wajib alasan baku. */
export function validasiKeputusan(i: InputKeputusan): Record<string, string> {
	const g: Record<string, string> = {};
	if (i.keputusan !== 'SETUJU' && i.keputusan !== 'REVISI' && i.keputusan !== 'TOLAK') {
		g.keputusan = 'Pilih SETUJU, REVISI, atau TOLAK.';
		return g;
	}
	if (i.keputusan !== 'SETUJU' && !(i.alasan_baku ?? '').trim()) {
		g.alasan_baku = 'Alasan baku wajib untuk REVISI atau TOLAK.';
	}
	if ((i.catatan ?? '').length > MAKS_CATATAN) {
		g.catatan = `Catatan maksimal ${MAKS_CATATAN} karakter.`;
	}
	return g;
}

function mulaiHariUtc(d: Date): number {
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** `berlaku_mulai` (YYYY-MM-DD) minimal 14 hari kalender setelah hari ini (UTC). */
export function berlakuMulaiSah(berlakuMulai: string, sekarang: Date): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(berlakuMulai)) return false;
	const t = Date.parse(`${berlakuMulai}T00:00:00Z`);
	if (Number.isNaN(t)) return false;
	return t - mulaiHariUtc(sekarang) >= MIN_HARI_BERLAKU_KOMISI * 86_400_000;
}

export function validasiKomisi(tarif: number, berlakuMulai: string, sekarang: Date): Record<string, string> {
	const g: Record<string, string> = {};
	if (!Number.isInteger(tarif) || tarif < 0 || tarif > 100) {
		g.tarif_default_persen = 'Tarif harus bilangan bulat 0–100.';
	}
	if (!berlakuMulaiSah(berlakuMulai, sekarang)) {
		g.berlaku_mulai = `Tanggal berlaku minimal ${MIN_HARI_BERLAKU_KOMISI} hari dari hari ini.`;
	}
	return g;
}
