import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { buatPemanggil } from '$lib/api/pemanggil';
import { buatKlienPasaree } from '$lib/api/pasaree';

/** Nama cookie httpOnly berisi JWT akses (aud `pasaree`). Tidak pernah ke localStorage. */
export const COOKIE_AKSES = 'psr_akses';

function baseUrl(): string {
	return env.PASAREE_API_URL ?? 'http://localhost:8080';
}

export function klienDari(cookies: Cookies, f: typeof fetch) {
	const token = cookies.get(COOKIE_AKSES) ?? '';
	return {
		klien: buatKlienPasaree({ baseUrl: baseUrl(), token, fetch: f }),
		panggil: buatPemanggil({ baseUrl: baseUrl(), token, fetch: f }),
		punyaToken: token !== ''
	};
}
