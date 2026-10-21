import { fail } from '@sveltejs/kit';
import { GalatApi } from '$lib/api/pasaree';
import { ambilSemuaAntrean } from '$lib/api/kurasi';
import { perluNotifikasiKetua, urutkanAntrean, validasiKeputusan, type Keputusan } from '$lib/kurasi/aturan';
import { kurasiDari, wajibPeran } from '$lib/server/kurasi';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	wajibPeran(cookies, 'kurasi.keputusan');
	const k = kurasiDari(cookies, fetch);
	const semua = await ambilSemuaAntrean((cursor) => k.antrean({ limit: 50, cursor }));
	return { antrean: urutkanAntrean(semua), jumlah: semua.length, notifikasiKetua: perluNotifikasiKetua(semua.length) };
};

export const actions: Actions = {
	putuskan: async ({ request, cookies, fetch }) => {
		wajibPeran(cookies, 'kurasi.keputusan');
		const f = await request.formData();
		const produkId = String(f.get('produk_id') ?? '');
		const keputusan = String(f.get('keputusan') ?? '') as Keputusan | '';
		const alasan = String(f.get('alasan_baku') ?? '') || undefined;
		const catatan = String(f.get('catatan') ?? '') || undefined;
		const galat = validasiKeputusan({ keputusan, alasan_baku: alasan, catatan });
		if (Object.keys(galat).length > 0) return fail(422, { produkId, galat });
		try {
			const r = await kurasiDari(cookies, fetch).putuskan(produkId, {
				keputusan: keputusan as Keputusan,
				alasan_baku: keputusan === 'SETUJU' ? undefined : alasan,
				catatan
			});
			return { produkId, status: r.status };
		} catch (e) {
			if (e instanceof GalatApi) return fail(e.status === 409 ? 409 : 400, { produkId, galat: { server: e.body?.pesan ?? 'Keputusan gagal.' } });
			throw e;
		}
	}
};
