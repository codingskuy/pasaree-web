import type { Cookies } from '@sveltejs/kit';
import { buatKlienOperasional } from '$lib/api/operasional';
import { klienDari } from './klien';

export function operasionalDari(cookies: Cookies, f: typeof fetch) {
	const { panggil, punyaToken } = klienDari(cookies, f);
	return { op: buatKlienOperasional(panggil), punyaToken };
}
