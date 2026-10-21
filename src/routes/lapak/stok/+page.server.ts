import { fail } from '@sveltejs/kit';
import { pesanGalat } from '$lib/api/operasional';
import { pratinjauHarga, stokSah } from '$lib/operasional/aturan';
import { operasionalDari } from '$lib/server/operasional';
import type { Actions } from './$types';

// ASUMSI: openapi belum punya endpoint daftar varian lapak; varian_id diisi dari halaman produk.
export const actions: Actions = {
	stok: async ({ request, cookies, fetch }) => {
		const f = await request.formData();
		const varianId = String(f.get('varian_id') ?? '');
		const stok = Number(f.get('stok'));
		const alasan = String(f.get('alasan') ?? '').trim() || 'penyesuaian stok';
		if (!stokSah(stok)) return fail(422, { varianId, galat: 'Stok harus bilangan bulat ≥ 0.' });
		try {
			const { op } = operasionalDari(cookies, fetch);
			const r = await op.ubahStok(varianId, stok, alasan);
			return { varianId, stok: r.stok, statusProduk: r.status_produk };
		} catch (e) {
			const g = pesanGalat(e);
			return fail(400, { varianId, galat: g.pesan, stokTerkini: g.stokTerkini });
		}
	},
	harga: async ({ request, cookies, fetch }) => {
		const f = await request.formData();
		const varianId = String(f.get('varian_id') ?? '');
		const lama = Number(f.get('harga_lama') ?? 0);
		const baru = Number(f.get('harga_idr'));
		const p = pratinjauHarga(lama, baru);
		if (!p.sah) return fail(422, { varianId, galat: p.pesan });
		try {
			const { op } = operasionalDari(cookies, fetch);
			const r = await op.ubahHarga(varianId, baru);
			return { varianId, hargaIdr: r.harga_idr, kurasiUlang: r.kurasi_ulang_ringan };
		} catch (e) {
			return fail(400, { varianId, galat: pesanGalat(e).pesan });
		}
	}
};
