/**
 * Validasi draf produk di sisi klien (UX cepat). Aturan mengikuti
 * `lapak/10-sop-tayang-produk.md` §3. Keputusan resmi tetap di backend
 * (`cek_otomatis`); fungsi di sini hanya mencegah perjalanan sia-sia.
 */
import type { CekOtomatis, KategoriKode, Satuan, Tag } from '$lib/api/pasaree';

export const KATEGORI: readonly KategoriKode[] = [
	'pangan-segar',
	'pangan-olahan',
	'bumbu-dapur',
	'minuman',
	'kerajinan-pangan',
	'paket-hampers'
];

export const TAG_BAKU: readonly Tag[] = [
	'pedas',
	'manis',
	'vegan',
	'gluten-free',
	'frozen',
	'siap-saji',
	'kemasan-ulang',
	'edisi-musiman'
];

export const SATUAN: readonly Satuan[] = ['g', 'ml', 'pcs', 'paket'];
export const KATEGORI_PANGAN: readonly KategoriKode[] = ['pangan-segar', 'pangan-olahan', 'bumbu-dapur', 'minuman'];
export const KELIPATAN_HARGA = 500;
export const MAKS_TAG = 2;

export interface VarianForm {
	nama_varian: string;
	sku: string;
	harga_idr: number;
	stok: number;
	satuan: Satuan;
	berat_kirim_gram: number;
}

export interface FormDraf {
	judul: string;
	kategori_kode: KategoriKode | '';
	tag: Tag[];
	deskripsi: string;
	komposisi: string;
	alergen: string[];
	varian: VarianForm[];
}

export interface Kesalahan {
	kolom: string;
	pesan: string;
}

const POLA_BERAT_ISI =
	/\d+(?:[.,]\d+)?\s*(?:kg|gr|gram|g|ml|l|liter|pcs|pack|porsi|isi|butir|sachet|botol|bungkus|biji|lembar)\b/i;

export function formKosong(): FormDraf {
	return {
		judul: '',
		kategori_kode: '',
		tag: [],
		deskripsi: '',
		komposisi: '',
		alergen: [],
		varian: [{ nama_varian: '', sku: '', harga_idr: 0, stok: 0, satuan: 'g', berat_kirim_gram: 0 }]
	};
}

export function hargaValid(harga: number): boolean {
	return Number.isInteger(harga) && harga > 0 && harga % KELIPATAN_HARGA === 0;
}

export function validasiDraf(f: FormDraf): Kesalahan[] {
	const k: Kesalahan[] = [];
	const judul = f.judul.trim();
	if (judul.length < 10 || judul.length > 80) {
		k.push({ kolom: 'judul', pesan: 'Judul harus 10–80 karakter.' });
	} else if (!POLA_BERAT_ISI.test(judul)) {
		k.push({ kolom: 'judul', pesan: 'Judul harus memuat berat/isi, contoh "Keripik Tempe 250 g".' });
	}
	if (!KATEGORI.includes(f.kategori_kode as KategoriKode)) {
		k.push({ kolom: 'kategori_kode', pesan: 'Pilih kategori primer dari daftar baku.' });
	}
	if (f.tag.length > MAKS_TAG) {
		k.push({ kolom: 'tag', pesan: `Maksimal ${MAKS_TAG} tag baku.` });
	} else if (f.tag.some((t) => !TAG_BAKU.includes(t))) {
		k.push({ kolom: 'tag', pesan: 'Tag harus dari daftar baku.' });
	}
	if (f.varian.length === 0) {
		k.push({ kolom: 'varian', pesan: 'Minimal satu varian.' });
	}
	const sku = new Set<string>();
	f.varian.forEach((v, i) => {
		const p = `varian[${i}]`;
		if (!v.nama_varian.trim()) k.push({ kolom: `${p}.nama_varian`, pesan: 'Nama varian wajib diisi.' });
		const s = v.sku.trim();
		if (!s) k.push({ kolom: `${p}.sku`, pesan: 'SKU wajib diisi.' });
		else if (sku.has(s)) k.push({ kolom: `${p}.sku`, pesan: 'SKU tidak boleh kembar dalam satu produk.' });
		sku.add(s);
		if (!hargaValid(v.harga_idr)) {
			k.push({ kolom: `${p}.harga_idr`, pesan: 'Harga harus bilangan bulat > 0 dan kelipatan Rp500.' });
		}
		if (!Number.isInteger(v.stok) || v.stok < 0) {
			k.push({ kolom: `${p}.stok`, pesan: 'Stok harus bilangan bulat ≥ 0.' });
		}
		if (!Number.isInteger(v.berat_kirim_gram) || v.berat_kirim_gram <= 0) {
			k.push({ kolom: `${p}.berat_kirim_gram`, pesan: 'Berat kirim (gram) harus > 0.' });
		}
	});
	if (KATEGORI_PANGAN.includes(f.kategori_kode as KategoriKode)) {
		if (!f.komposisi.trim()) k.push({ kolom: 'komposisi', pesan: 'Komposisi wajib untuk produk pangan.' });
		if (f.alergen.length === 0) {
			k.push({ kolom: 'alergen', pesan: 'Isi alergen (atau "tidak ada") untuk produk pangan.' });
		}
	}
	return k;
}

/** Peta kolom -> pesan, untuk menyorot input tanpa mereset formulir. */
export function petaKesalahan(daftar: readonly Kesalahan[]): Record<string, string> {
	const peta: Record<string, string> = {};
	for (const e of daftar) if (!(e.kolom in peta)) peta[e.kolom] = e.pesan;
	return peta;
}

/** Ekstrak kesalahan dari hasil `cek_otomatis` (200) atau detail Error 422 (bentuk belum dirinci di openapi). */
export function kesalahanDariCek(cek: CekOtomatis | null | undefined): Kesalahan[] {
	return cek && !cek.lolos ? [...cek.kesalahan] : [];
}

export function kesalahanDari422(detail: Record<string, unknown> | undefined): Kesalahan[] {
	const mentah = detail?.kesalahan;
	if (!Array.isArray(mentah)) return [];
	return mentah.flatMap((e) =>
		e && typeof e.kolom === 'string' && typeof e.pesan === 'string'
			? [{ kolom: e.kolom, pesan: e.pesan }]
			: []
	);
}

/* ---------------- Media ---------------- */

export const MEDIA = {
	fotoMaksByte: 5 * 1024 * 1024,
	fotoMinSisi: 800,
	fotoMaks: 6,
	videoMaksByte: 50 * 1024 * 1024,
	videoMaksDetik: 30
} as const;

export interface BerkasMedia {
	jenis: 'FOTO' | 'VIDEO';
	ukuran_byte: number;
	lebar?: number;
	tinggi?: number;
	durasi_detik?: number;
}

export function validasiMedia(berkas: BerkasMedia, jumlahFotoSaatIni: number): string[] {
	const e: string[] = [];
	if (berkas.jenis === 'FOTO') {
		if (jumlahFotoSaatIni >= MEDIA.fotoMaks) e.push(`Maksimal ${MEDIA.fotoMaks} foto.`);
		if (berkas.ukuran_byte > MEDIA.fotoMaksByte) e.push('Foto maksimal 5 MB.');
		if ((berkas.lebar ?? 0) < MEDIA.fotoMinSisi || (berkas.tinggi ?? 0) < MEDIA.fotoMinSisi) {
			e.push('Foto minimal 800×800 piksel.');
		}
	} else {
		if (berkas.ukuran_byte > MEDIA.videoMaksByte) e.push('Video maksimal 50 MB.');
		if ((berkas.durasi_detik ?? Infinity) > MEDIA.videoMaksDetik) e.push('Video maksimal 30 detik.');
	}
	return e;
}
