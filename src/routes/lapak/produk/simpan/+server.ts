import { error, json } from '@sveltejs/kit';
import { GalatApi } from '$lib/api/pasaree';
import { klienDari } from '$lib/server/klien';
import { kesalahanDari422, kesalahanDariCek, type FormDraf } from '$lib/produk/validasi';
import type { RequestHandler } from './$types';

interface Badan {
	lapak_id: string;
	produk_id?: string;
	kunci_idempoten: string;
	form: FormDraf;
	ajukan?: boolean;
}

/**
 * Proksi server untuk autosave dan Ajukan Kurasi. Token ada di cookie httpOnly,
 * tidak pernah menyentuh browser. Kesalahan 422 dikembalikan sebagai daftar kolom
 * (status 200 + `kesalahan`) agar formulir tidak direset.
 */
export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const { klien, punyaToken } = klienDari(cookies, fetch);
	if (!punyaToken) error(401, 'Sesi berakhir, silakan masuk lagi.');
	const b = (await request.json()) as Badan;
	const f = b.form;
	try {
		let produkId = b.produk_id;
		if (!produkId) {
			const dibuat = await klien.buatDraf(
				{
					lapak_id: b.lapak_id,
					judul: f.judul,
					kategori_kode: f.kategori_kode as Exclude<FormDraf['kategori_kode'], ''>,
					tag: f.tag,
					deskripsi: f.deskripsi,
					komposisi: f.komposisi || undefined,
					alergen: f.alergen
				},
				b.kunci_idempoten
			);
			produkId = dibuat.produk_id;
		}
		const hasil = await klien.ubahProduk(produkId, {
			judul: f.judul,
			deskripsi: f.deskripsi,
			tag: f.tag,
			komposisi: f.komposisi || null,
			alergen: f.alergen,
			varian: f.varian
		});
		const kesalahan = kesalahanDariCek(hasil.cek_otomatis);
		if (b.ajukan && kesalahan.length === 0) {
			const r = await klien.ajukanKurasi(produkId);
			return json({ produk_id: produkId, kesalahan: [], status: r.status, estimasi_sla: r.estimasi_sla });
		}
		return json({ produk_id: produkId, kesalahan });
	} catch (e) {
		if (e instanceof GalatApi && e.status === 422) {
			return json({
				produk_id: b.produk_id ?? null,
				kesalahan: kesalahanDari422(e.body?.detail),
				pesan: e.body?.pesan ?? 'Cek otomatis gagal.'
			});
		}
		if (e instanceof GalatApi) error(e.status, e.body?.pesan ?? 'Permintaan gagal.');
		throw e;
	}
};
