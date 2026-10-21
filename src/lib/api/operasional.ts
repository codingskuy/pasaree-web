/**
 * Klien operasional lapak: stok, harga, pesanan masuk. Tipe dari
 * `docs/api/openapi.yaml` (pasaree-backend-service, branch feat/psr-be-003-fondasi).
 */
import type { ErrorApi, ProdukStatus } from './pasaree';
import { GalatApi } from './pasaree';
import type { Pemanggil } from './pemanggil';

export type StatusPesanan =
	| 'DRAF_KERANJANG'
	| 'DIPESAN'
	| 'DIBAYAR'
	| 'DIKONFIRMASI_LAPAK'
	| 'DISERAHKAN_KE_TRIP'
	| 'DITERIMA_PEMBELI'
	| 'SELESAI'
	| 'DIBATALKAN'
	| 'DIKEMBALIKAN';

export interface SubPesananMasuk {
	sub_id: string;
	pesanan_id: string;
	varian: { sku: string; qty: number }[];
	total_idr: number;
	batas_konfirmasi_hingga: string;
	trip_id: string;
}

export function buatKlienOperasional(panggil: Pemanggil) {
	const id = encodeURIComponent;
	return {
		ubahStok: (varianId: string, stok: number, alasan: string) =>
			panggil<{ stok: number; status_produk: ProdukStatus }>('PATCH', `/web/varian/${id(varianId)}/stok`, {
				body: { stok, alasan }
			}),
		ubahHarga: (varianId: string, hargaIdr: number) =>
			panggil<{ harga_idr: number; kurasi_ulang_ringan: boolean }>('PATCH', `/web/varian/${id(varianId)}/harga`, {
				body: { harga_idr: hargaIdr }
			}),
		pesananMasuk: (q: { status?: string; lapak_id?: string } = {}) => {
			const p = new URLSearchParams();
			for (const [k, v] of Object.entries(q)) if (v !== undefined) p.set(k, v);
			const qs = p.toString();
			return panggil<{ data: SubPesananMasuk[] }>('GET', `/web/pesanan-masuk${qs ? `?${qs}` : ''}`);
		},
		konfirmasi: (subId: string, terima: boolean, alasan: string | undefined, idempotencyKey: string) =>
			panggil<{ status: StatusPesanan }>('POST', `/web/pesanan-masuk/${id(subId)}/konfirmasi`, {
				body: { terima, ...(alasan ? { alasan } : {}) },
				idempotencyKey
			}),
		serahTrip: (subId: string, tripId: string, kodeSerah: string, idempotencyKey: string) =>
			panggil<{ status: 'DISERAHKAN_KE_TRIP' }>('POST', `/web/pesanan-masuk/${id(subId)}/serah-trip`, {
				body: { trip_id: tripId, kode_serah: kodeSerah },
				idempotencyKey
			})
	};
}

export type KlienOperasional = ReturnType<typeof buatKlienOperasional>;

export interface GalatTampil {
	pesan: string;
	/** Stok terkini bila 409 STOK_HABIS memuatnya (ASUMSI: `detail.stok_terkini`, belum dirinci di openapi). */
	stokTerkini?: number;
}

/** Terjemahkan galat backend ke pesan Indonesia untuk UI. */
export function pesanGalat(e: unknown): GalatTampil {
	if (!(e instanceof GalatApi)) return { pesan: 'Terjadi gangguan jaringan. Coba lagi.' };
	const b: ErrorApi | null = e.body;
	if (e.status === 409 && b?.kode === 'STOK_HABIS') {
		const s = b.detail?.stok_terkini;
		const stokTerkini = typeof s === 'number' ? s : undefined;
		return {
			pesan: stokTerkini === undefined ? 'Stok habis.' : `Stok habis. Stok terkini: ${stokTerkini}.`,
			stokTerkini
		};
	}
	return { pesan: b?.pesan ?? `Permintaan gagal (HTTP ${e.status}).` };
}

/** Info yang ditampilkan setelah lapak menolak pesanan yang sudah dibayar. */
export const INFO_REFUND_OTOMATIS =
	'Pesanan sudah dibayar: dana dikembalikan otomatis ke pembeli melalui kasir Pasaree. Tidak perlu tindakan lanjutan.';
