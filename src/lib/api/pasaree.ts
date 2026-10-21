/**
 * Klien API web lapak Pasaree. Tipe diturunkan dari `docs/api/openapi.yaml`
 * (pasaree-backend-service, v1.0.0). Dipakai HANYA dari sisi server SvelteKit
 * (server load/actions) agar token tidak terekspos ke browser.
 */

export type KategoriKode =
	| 'pangan-segar'
	| 'pangan-olahan'
	| 'bumbu-dapur'
	| 'minuman'
	| 'kerajinan-pangan'
	| 'paket-hampers';

export type Tag =
	| 'pedas'
	| 'manis'
	| 'vegan'
	| 'gluten-free'
	| 'frozen'
	| 'siap-saji'
	| 'kemasan-ulang'
	| 'edisi-musiman';

export type Satuan = 'g' | 'ml' | 'pcs' | 'paket';

export type ProdukStatus =
	| 'DRAF'
	| 'MENUNGGU_KURASI'
	| 'PERLU_REVISI'
	| 'TAYANG'
	| 'NONAKTIF_STOK_0'
	| 'TAKEDOWN'
	| 'ARSIP';

export interface ErrorApi {
	kode: string;
	pesan: string;
	detail?: Record<string, unknown>;
}

export interface LapakSaya {
	id: string;
	nama_lapak: string;
	slug: string;
	status: 'AKTIF' | 'BEKU' | 'TUTUP';
	skor_fulfillment_persen: number;
	saldo_tertahan_idr: number;
}

export interface DrafProdukPayload {
	lapak_id: string;
	judul: string;
	kategori_kode: KategoriKode;
	tag: Tag[];
	deskripsi: string;
	komposisi?: string;
	alergen?: string[];
}

export interface VarianProduk {
	id?: string;
	produk_id?: string;
	nama_varian: string;
	sku: string;
	harga_idr: number;
	stok: number;
	satuan: Satuan;
	berat_kirim_gram: number;
	tanggal_produksi?: string | null;
	kedaluwarsa?: string | null;
}

export interface MediaProduk {
	url: string;
	jenis: 'FOTO' | 'VIDEO';
	utama: boolean;
	lebar?: number;
	tinggi?: number;
}

export interface UbahProdukPayload {
	judul?: string;
	deskripsi?: string;
	tag?: Tag[];
	komposisi?: string | null;
	alergen?: string[];
	varian?: VarianProduk[];
	media?: MediaProduk[];
}

export interface CekOtomatis {
	lolos: boolean;
	kesalahan: { kolom: string; pesan: string }[];
}

export interface PresignedRequest {
	nama_berkas: string;
	tipe_mime: string;
	ukuran_byte: number;
}

export interface PresignedResponse {
	unggah_url: string;
	media_url: string;
	kedaluwarsa: string;
}

export interface RingkasProduk {
	id: string;
	judul: string;
	status: ProdukStatus;
	perlu_revisi_catatan?: string | null;
}

/** Galat HTTP dari backend; `body` mengikuti skema `Error` openapi bila ada. */
export class GalatApi extends Error {
	constructor(
		readonly status: number,
		readonly body: ErrorApi | null
	) {
		super(body?.pesan ?? `HTTP ${status}`);
		this.name = 'GalatApi';
	}
}

export interface OpsiKlien {
	baseUrl: string;
	token: string;
	fetch?: typeof fetch;
}

export function buatKlienPasaree({ baseUrl, token, fetch: f = fetch }: OpsiKlien) {
	const base = baseUrl.replace(/\/+$/, '');

	async function panggil<T>(
		method: string,
		path: string,
		opsi: { body?: unknown; idempotencyKey?: string } = {}
	): Promise<T> {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json'
		};
		if (opsi.body !== undefined) headers['Content-Type'] = 'application/json';
		if (opsi.idempotencyKey) headers['Idempotency-Key'] = opsi.idempotencyKey;
		const res = await f(`${base}${path}`, {
			method,
			headers,
			body: opsi.body === undefined ? undefined : JSON.stringify(opsi.body)
		});
		const teks = await res.text();
		let json: unknown = null;
		if (teks) {
			try {
				json = JSON.parse(teks);
			} catch {
				json = null;
			}
		}
		if (!res.ok) throw new GalatApi(res.status, json as ErrorApi | null);
		return json as T;
	}

	return {
		lapakSaya: () => panggil<{ data: LapakSaya[] }>('GET', '/web/lapak-saya'),
		daftarProduk: (q: { status?: ProdukStatus; lapak_id?: string; limit?: number; cursor?: string } = {}) => {
			const p = new URLSearchParams();
			for (const [k, v] of Object.entries(q)) if (v !== undefined) p.set(k, String(v));
			const qs = p.toString();
			return panggil<{ data: RingkasProduk[]; cursor_lanjut: string | null }>(
				'GET',
				`/web/produk${qs ? `?${qs}` : ''}`
			);
		},
		buatDraf: (payload: DrafProdukPayload, idempotencyKey: string) =>
			panggil<{ produk_id: string; status: 'DRAF' }>('POST', '/web/produk/draf', {
				body: payload,
				idempotencyKey
			}),
		ubahProduk: (id: string, payload: UbahProdukPayload) =>
			panggil<{ produk_id: string; cek_otomatis: CekOtomatis }>(
				'PUT',
				`/web/produk/${encodeURIComponent(id)}`,
				{ body: payload }
			),
		ajukanKurasi: (id: string) =>
			panggil<{ status: 'MENUNGGU_KURASI'; estimasi_sla: string }>(
				'POST',
				`/web/produk/${encodeURIComponent(id)}/ajukan-kurasi`
			),
		mintaPresigned: (req: PresignedRequest) =>
			panggil<PresignedResponse>('POST', '/web/media/presigned', { body: req })
	};
}

export type KlienPasaree = ReturnType<typeof buatKlienPasaree>;
