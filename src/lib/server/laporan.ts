/**
 * Sumber data laporan dan pengumuman tarif.
 *
 * ASUMSI / MOCK: openapi backend (feat/psr-be-003-fondasi) BELUM memiliki endpoint
 * laporan lapak maupun pengumuman tarif. Sampai ada, halaman memakai data contoh
 * di bawah. Saat endpoint terbit (mis. `GET /web/laporan?periode=` dan
 * `GET /web/pengumuman-tarif`), ganti isi dua fungsi ini; pemanggil tidak berubah.
 */
import type { BarisLaporan, PengumumanTarif, Periode } from '$lib/laporan/csv';

export const SUMBER_LAPORAN_MOCK = true;

export async function ambilLaporan(_periode: Periode): Promise<BarisLaporan[]> {
	return [
		{ pesanan_id: 'PSN-001', escrow_id: 'ESC-001', subtotal: 50000, komisi: 4000, ongkir: 8000, payout: 46000, status: 'SELESAI' },
		{ pesanan_id: 'PSN-002', escrow_id: 'ESC-002', subtotal: 25000, komisi: 2000, ongkir: 8000, payout: 23000, status: 'DISERAHKAN_KE_TRIP' }
	];
}

export async function ambilPengumumanTarif(): Promise<PengumumanTarif[]> {
	return [];
}
