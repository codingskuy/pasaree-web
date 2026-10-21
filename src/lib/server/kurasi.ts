import { error } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { buatKlienKurasi } from '$lib/api/kurasi';
import { boleh, peranDariToken, type Aksi, type Peran } from '$lib/kurasi/peran';
import { COOKIE_AKSES, klienDari } from './klien';

/**
 * Gerbang peran sisi server. Ini LAPISAN KENYAMANAN (UI); backend tetap penegak
 * resmi lewat 403 `AKSES_DITOLAK`.
 */
export function wajibPeran(cookies: Cookies, aksi: Aksi): Peran {
	const token = cookies.get(COOKIE_AKSES);
	if (!token) error(401, 'Sesi berakhir, silakan masuk lagi.');
	const peran = peranDariToken(token);
	if (!boleh(peran, aksi)) error(403, 'Peran Anda tidak berhak mengakses halaman ini.');
	return peran as Peran;
}

export function kurasiDari(cookies: Cookies, f: typeof fetch) {
	return buatKlienKurasi(klienDari(cookies, f).panggil);
}
