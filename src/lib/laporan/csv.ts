/**
 * Laporan lapak harian/mingguan/bulanan (CSV). Kolom baku rekonsiliasi:
 * pesanan_id, escrow_id, subtotal, komisi, ongkir, payout, status
 * (`keuangan/10-komisi-transparan.md` §4).
 */

export const KOLOM_CSV = ['pesanan_id', 'escrow_id', 'subtotal', 'komisi', 'ongkir', 'payout', 'status'] as const;

export interface BarisLaporan {
	pesanan_id: string;
	escrow_id: string;
	subtotal: number;
	komisi: number;
	ongkir: number;
	payout: number;
	status: string;
}

export type Periode = 'harian' | 'mingguan' | 'bulanan';

/** Lindungi dari CSV injection (sel diawali = + - @ tab CR) dan escape per RFC 4180. */
export function selCsv(nilai: string | number): string {
	let s = String(nilai);
	if (typeof nilai === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
	return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function bangunCsv(baris: readonly BarisLaporan[]): string {
	const isi = baris.map((b) => KOLOM_CSV.map((k) => selCsv(b[k])).join(','));
	return [KOLOM_CSV.join(','), ...isi].join('\r\n') + '\r\n';
}

/** Rentang [mulai, akhir) dalam UTC: hari ini; 7 hari terakhir; bulan kalender berjalan. */
export function rentangPeriode(p: Periode, sekarang: Date): { mulai: Date; akhir: Date } {
	const hari = Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), sekarang.getUTCDate());
	if (p === 'harian') return { mulai: new Date(hari), akhir: new Date(hari + 86_400_000) };
	if (p === 'mingguan') return { mulai: new Date(hari - 6 * 86_400_000), akhir: new Date(hari + 86_400_000) };
	return {
		mulai: new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), 1)),
		akhir: new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() + 1, 1))
	};
}

export function periodeSah(x: string | null): x is Periode {
	return x === 'harian' || x === 'mingguan' || x === 'bulanan';
}

export function namaBerkas(p: Periode, sekarang: Date): string {
	return `laporan-lapak-${p}-${sekarang.toISOString().slice(0, 10)}.csv`;
}

/** Pengumuman perubahan tarif; tampil 14 hari sebelum berlaku hingga hari berlaku. */
export interface PengumumanTarif {
	tarif_persen: number;
	berlaku_mulai: string; // YYYY-MM-DD
}

export const HARI_PENGUMUMAN = 14;

export function pengumumanAktif(daftar: readonly PengumumanTarif[], sekarang: Date): PengumumanTarif[] {
	const hari = Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), sekarang.getUTCDate());
	return daftar
		.filter((p) => {
			const t = Date.parse(`${p.berlaku_mulai}T00:00:00Z`);
			return !Number.isNaN(t) && t >= hari && t - hari <= HARI_PENGUMUMAN * 86_400_000;
		})
		.sort((a, b) => a.berlaku_mulai.localeCompare(b.berlaku_mulai));
}
