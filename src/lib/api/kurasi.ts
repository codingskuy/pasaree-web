/** Klien kurasi dan admin komisi. Tipe dari `docs/api/openapi.yaml` (backend, feat/psr-be-003-fondasi). */
import type { KategoriKode, ProdukStatus } from './pasaree';
import type { Pemanggil } from './pemanggil';
import type { ItemAntrean, Keputusan } from '$lib/kurasi/aturan';

export interface HalamanAntrean {
	data: ItemAntrean[];
	cursor_lanjut: string | null;
}

export function buatKlienKurasi(panggil: Pemanggil) {
	return {
		antrean: (q: { kategori?: KategoriKode; limit?: number; cursor?: string } = {}) => {
			const p = new URLSearchParams();
			for (const [k, v] of Object.entries(q)) if (v !== undefined) p.set(k, String(v));
			const qs = p.toString();
			return panggil<HalamanAntrean>('GET', `/web/kurasi/antrean${qs ? `?${qs}` : ''}`);
		},
		putuskan: (produkId: string, k: { keputusan: Keputusan; alasan_baku?: string; catatan?: string }) =>
			panggil<{ status: ProdukStatus }>('POST', `/web/kurasi/${encodeURIComponent(produkId)}/keputusan`, { body: k }),
		ubahKomisi: (tarifDefaultPersen: number, berlakuMulai: string) =>
			panggil<{ tarif_persen: number; berlaku_mulai: string }>('PATCH', '/web/admin/komisi', {
				body: { tarif_default_persen: tarifDefaultPersen, berlaku_mulai: berlakuMulai }
			})
	};
}

/** Telusuri semua halaman antrean (maks `batasHalaman`) untuk menghitung panjang antrean. */
export async function ambilSemuaAntrean(
	ambil: (cursor?: string) => Promise<HalamanAntrean>,
	batasHalaman = 20
): Promise<ItemAntrean[]> {
	const semua: ItemAntrean[] = [];
	let cursor: string | undefined;
	for (let i = 0; i < batasHalaman; i++) {
		const h = await ambil(cursor);
		semua.push(...h.data);
		if (!h.cursor_lanjut) break;
		cursor = h.cursor_lanjut;
	}
	return semua;
}
