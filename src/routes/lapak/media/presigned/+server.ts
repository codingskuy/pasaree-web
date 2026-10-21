import { error, json } from '@sveltejs/kit';
import { GalatApi, type PresignedRequest } from '$lib/api/pasaree';
import { klienDari } from '$lib/server/klien';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const { klien, punyaToken } = klienDari(cookies, fetch);
	if (!punyaToken) error(401, 'Sesi berakhir, silakan masuk lagi.');
	try {
		return json(await klien.mintaPresigned((await request.json()) as PresignedRequest));
	} catch (e) {
		if (e instanceof GalatApi) error(e.status, e.body?.pesan ?? 'Permintaan gagal.');
		throw e;
	}
};
