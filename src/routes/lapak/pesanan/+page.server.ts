import { fail } from '@sveltejs/kit';
import { INFO_REFUND_OTOMATIS, pesanGalat } from '$lib/api/operasional';
import { kodeSerahSah, tripIdSah } from '$lib/operasional/aturan';
import { operasionalDari } from '$lib/server/operasional';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
	const { op, punyaToken } = operasionalDari(cookies, fetch);
	if (!punyaToken) return { pesanan: [], galat: 'Sesi berakhir, silakan masuk lagi.' };
	try {
		const lapak_id = url.searchParams.get('lapak_id') ?? undefined;
		return { pesanan: (await op.pesananMasuk({ lapak_id })).data, galat: null };
	} catch (e) {
		return { pesanan: [], galat: pesanGalat(e).pesan };
	}
};

export const actions: Actions = {
	konfirmasi: async ({ request, cookies, fetch }) => {
		const f = await request.formData();
		const subId = String(f.get('sub_id') ?? '');
		const terima = f.get('terima') === 'true';
		const alasan = String(f.get('alasan') ?? '') || undefined;
		const kunci = String(f.get('kunci') ?? '') || crypto.randomUUID();
		if (!terima && !alasan) return fail(422, { subId, galat: 'Alasan penolakan wajib diisi.' });
		try {
			const { op } = operasionalDari(cookies, fetch);
			const r = await op.konfirmasi(subId, terima, alasan, kunci);
			return { subId, status: r.status, info: terima ? null : INFO_REFUND_OTOMATIS };
		} catch (e) {
			return fail(400, { subId, galat: pesanGalat(e).pesan });
		}
	},
	serah: async ({ request, cookies, fetch }) => {
		const f = await request.formData();
		const subId = String(f.get('sub_id') ?? '');
		const tripId = String(f.get('trip_id') ?? '');
		const kode = String(f.get('kode_serah') ?? '');
		const kunci = String(f.get('kunci') ?? '') || crypto.randomUUID();
		if (!tripIdSah(tripId) || !kodeSerahSah(kode)) {
			return fail(422, { subId, galat: 'trip_id dan kode_serah wajib diisi.' });
		}
		try {
			const { op } = operasionalDari(cookies, fetch);
			const r = await op.serahTrip(subId, tripId.trim(), kode.trim(), kunci);
			return { subId, status: r.status, info: null };
		} catch (e) {
			return fail(400, { subId, galat: pesanGalat(e).pesan });
		}
	}
};
