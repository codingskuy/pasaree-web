/**
 * Hak akses per peran, mengikuti tabel `lapak/10-sop-tayang-produk.md` §6.
 * HANYA untuk menyembunyikan/menonaktifkan UI; penegakan sebenarnya di backend
 * (403 `AKSES_DITOLAK`). Klaim peran pada JWT diasumsikan bernama `peran`
 * (openapi hanya mendefinisikan enum `Peran`, belum klaimnya).
 */
export type Peran = 'PRODUSEN' | 'OPERATOR' | 'KURATOR' | 'ADMIN' | 'PEMBELI';

export type Aksi =
	| 'draf.crud'
	| 'kurasi.ajukan'
	| 'stok.isi'
	| 'komisi.lihat'
	| 'payout.ubah_rekening'
	| 'kurasi.keputusan'
	| 'produk.takedown'
	| 'takedown.permanen'
	| 'kategori.kelola'
	| 'komisi.ubah';

const IZIN: Record<Peran, readonly Aksi[]> = {
	PRODUSEN: ['draf.crud', 'kurasi.ajukan', 'stok.isi', 'komisi.lihat', 'payout.ubah_rekening'],
	OPERATOR: ['draf.crud', 'stok.isi'],
	KURATOR: ['kurasi.keputusan', 'produk.takedown'],
	ADMIN: ['kategori.kelola', 'komisi.ubah', 'takedown.permanen'],
	PEMBELI: []
};

const PERAN_SAH: readonly string[] = ['PRODUSEN', 'OPERATOR', 'KURATOR', 'ADMIN', 'PEMBELI'];

export function boleh(peran: Peran | null | undefined, aksi: Aksi): boolean {
	return !!peran && IZIN[peran].includes(aksi);
}

/** Baca klaim `peran` dari payload JWT tanpa verifikasi (verifikasi = urusan backend). */
export function peranDariToken(token: string): Peran | null {
	const bagian = token.split('.');
	if (bagian.length !== 3) return null;
	try {
		const b64 = bagian[1].replace(/-/g, '+').replace(/_/g, '/');
		const payload = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
		return typeof payload.peran === 'string' && PERAN_SAH.includes(payload.peran) ? (payload.peran as Peran) : null;
	} catch {
		return null;
	}
}
