import { fail } from '@sveltejs/kit';
import { GalatApi } from '$lib/api/pasaree';
import { validasiKomisi } from '$lib/kurasi/aturan';
import { kurasiDari, wajibPeran } from '$lib/server/kurasi';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
	wajibPeran(cookies, 'komisi.ubah');
	return {};
};

export const actions: Actions = {
	ubah: async ({ request, cookies, fetch }) => {
		wajibPeran(cookies, 'komisi.ubah');
		const f = await request.formData();
		const tarif = Number(f.get('tarif_default_persen'));
		const mulai = String(f.get('berlaku_mulai') ?? '');
		const galat = validasiKomisi(tarif, mulai, new Date());
		if (Object.keys(galat).length > 0) return fail(422, { galat });
		try {
			const r = await kurasiDari(cookies, fetch).ubahKomisi(tarif, mulai);
			return { tarif: r.tarif_persen, berlakuMulai: r.berlaku_mulai };
		} catch (e) {
			if (e instanceof GalatApi) return fail(e.status === 422 ? 422 : 400, { galat: { server: e.body?.pesan ?? 'Gagal mengubah komisi.' } });
			throw e;
		}
	}
};
