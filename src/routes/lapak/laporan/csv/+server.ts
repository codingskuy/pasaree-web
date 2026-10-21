import { error } from '@sveltejs/kit';
import { COOKIE_AKSES } from '$lib/server/klien';
import { bangunCsv, namaBerkas, periodeSah } from '$lib/laporan/csv';
import { ambilLaporan } from '$lib/server/laporan';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!cookies.get(COOKIE_AKSES)) error(401, 'Sesi berakhir, silakan masuk lagi.');
	const p = url.searchParams.get('periode');
	if (!periodeSah(p)) error(400, 'Periode harus harian, mingguan, atau bulanan.');
	const csv = bangunCsv(await ambilLaporan(p));
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${namaBerkas(p, new Date())}"`,
			'cache-control': 'no-store'
		}
	});
};
