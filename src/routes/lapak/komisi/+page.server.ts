import { pengumumanAktif } from '$lib/laporan/csv';
import { SUMBER_LAPORAN_MOCK, ambilPengumumanTarif } from '$lib/server/laporan';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	pengumuman: pengumumanAktif(await ambilPengumumanTarif(), new Date()),
	dataContoh: SUMBER_LAPORAN_MOCK
});
