/**
 * Aturan tampilan stok, harga, dan pesanan masuk. Sumber:
 * `produk/21-kontrak-api-web-bun.md` §4-§5, `lapak/10-sop-tayang-produk.md` §5.
 * Keputusan resmi (kurasi ulang, batas waktu) tetap di backend; di sini hanya
 * pratinjau agar produsen tahu akibat sebelum menekan simpan.
 */

export const KELIPATAN_HARGA = 500;
export const AMBANG_KURASI_ULANG_PERSEN = 20;
export const JAM_KERJA_MULAI = 7;
export const JAM_KERJA_SELESAI = 19;
/** Zona jam kerja lapak: WIB (UTC+7), tanpa DST. */
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

export function hargaSah(harga: number): boolean {
	return Number.isInteger(harga) && harga > 0 && harga % KELIPATAN_HARGA === 0;
}

export function stokSah(stok: number): boolean {
	return Number.isInteger(stok) && stok >= 0;
}

/** Kenaikan dalam persen (negatif bila turun), hanya untuk tampilan; keputusan memakai `memicuKurasiUlang`. */
export function kenaikanHargaPersen(lama: number, baru: number): number {
	if (lama <= 0) return 0;
	return ((baru - lama) / lama) * 100;
}

/** Kenaikan STRICT lebih dari 20% memicu kurasi ulang ringan (tepat 20% tidak). */
export function memicuKurasiUlang(lama: number, baru: number): boolean {
	return lama > 0 && (baru - lama) * 100 > lama * AMBANG_KURASI_ULANG_PERSEN;
}

export interface PratinjauHarga {
	sah: boolean;
	pesan?: string;
	kurasiUlang: boolean;
}

export function pratinjauHarga(lama: number, baru: number): PratinjauHarga {
	if (!hargaSah(baru)) {
		return { sah: false, pesan: 'Harga harus bilangan bulat > 0 dan kelipatan Rp500.', kurasiUlang: false };
	}
	return { sah: true, kurasiUlang: memicuKurasiUlang(lama, baru) };
}

function wib(d: Date): Date {
	return new Date(d.getTime() + OFFSET_WIB_MS);
}

/** Jam kerja 07.00-19.00 WIB (19.00 tepat sudah di luar). */
export function dalamJamKerja(d: Date): boolean {
	const jam = wib(d).getUTCHours();
	return jam >= JAM_KERJA_MULAI && jam < JAM_KERJA_SELESAI;
}

export interface SisaKonfirmasi {
	kedaluwarsa: boolean;
	menit: number;
	label: string;
}

/** Sisa waktu hingga `batas_konfirmasi_hingga` (ISO date-time dari server). */
export function sisaKonfirmasi(batasIso: string, sekarang: Date): SisaKonfirmasi {
	const selisih = new Date(batasIso).getTime() - sekarang.getTime();
	if (Number.isNaN(selisih) || selisih <= 0) {
		return { kedaluwarsa: true, menit: 0, label: 'Batas konfirmasi terlewat' };
	}
	const menit = Math.ceil(selisih / 60000);
	const j = Math.floor(menit / 60);
	const m = menit % 60;
	return { kedaluwarsa: false, menit, label: j > 0 ? `${j} jam ${m} menit lagi` : `${m} menit lagi` };
}

/** Tombol konfirmasi/tolak aktif bila belum lewat batas dan sedang jam kerja. */
export function bolehKonfirmasi(batasIso: string, sekarang: Date): { boleh: boolean; alasan?: string } {
	if (sisaKonfirmasi(batasIso, sekarang).kedaluwarsa) return { boleh: false, alasan: 'Batas konfirmasi terlewat.' };
	if (!dalamJamKerja(sekarang)) return { boleh: false, alasan: 'Di luar jam kerja (07.00–19.00 WIB).' };
	return { boleh: true };
}

export function kodeSerahSah(kode: string): boolean {
	return kode.trim().length > 0;
}

export function tripIdSah(id: string): boolean {
	return id.trim().length > 0;
}
