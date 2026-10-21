/**
 * Kalkulator komisi dan estimasi payout (BR-301, BR-302, BR-304;
 * `keuangan/10-komisi-transparan.md` §1-§2). Semua uang integer IDR.
 * Web hanya MENAMPILKAN; perhitungan resmi dilakukan backend/kasir.
 *
 * Rumus per baris: komisi_baris = floor(harga_idr * qty * tarif_persen / 100)
 * Estimasi payout: subtotal - sum(komisi_baris) - penalti
 */

export const TARIF_DEFAULT_PERSEN = 8;
export const TARIF_HAMPERS_PERSEN = 10;
export const TARIF_LAPAK_BARU_PERSEN = 5;
export const HARI_PROMO_LAPAK_BARU = 30;

export interface BarisPesanan {
	harga_idr: number;
	qty: number;
	/** Kategori produk, mis. `paket-hampers`. */
	kategori_kode?: string;
}

export interface KonteksTarif {
	/** Tarif default saat ini (dari backend); bawaan 8. */
	tarifDefaultPersen?: number;
	/** Waktu produk pertama lapak tayang; null = belum tayang. */
	produkPertamaTayang?: Date | null;
	sekarang: Date;
}

function wajibIntegerNonNegatif(n: number, nama: string): void {
	if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${nama} harus bilangan bulat >= 0`);
}

/** floor(n / 100) untuk integer n >= 0 tanpa risiko pembulatan float. */
function bagi100Lantai(n: number): number {
	return (n - (n % 100)) / 100;
}

/** Promo lapak baru berlaku 30 hari sejak produk pertama tayang (hari ke-30 masih termasuk). */
export function dalamPromoLapakBaru(produkPertamaTayang: Date | null | undefined, sekarang: Date): boolean {
	if (!produkPertamaTayang) return false;
	const selisih = sekarang.getTime() - produkPertamaTayang.getTime();
	return selisih >= 0 && selisih < HARI_PROMO_LAPAK_BARU * 86_400_000;
}

/**
 * Tarif untuk satu baris. ASUMSI (dokumen tidak menyebut prioritas): promo lapak
 * baru 5% mengalahkan tarif hampers 10% selama periode promo; ditandai di PR.
 */
export function tarifUntukBaris(b: BarisPesanan, k: KonteksTarif): number {
	if (dalamPromoLapakBaru(k.produkPertamaTayang, k.sekarang)) return TARIF_LAPAK_BARU_PERSEN;
	if (b.kategori_kode === 'paket-hampers') return TARIF_HAMPERS_PERSEN;
	return k.tarifDefaultPersen ?? TARIF_DEFAULT_PERSEN;
}

export function komisiBaris(hargaIdr: number, qty: number, tarifPersen: number): number {
	wajibIntegerNonNegatif(hargaIdr, 'harga_idr');
	wajibIntegerNonNegatif(qty, 'qty');
	wajibIntegerNonNegatif(tarifPersen, 'tarif_persen');
	return bagi100Lantai(hargaIdr * qty * tarifPersen);
}

export interface RincianBaris extends BarisPesanan {
	tarif_persen: number;
	subtotal_idr: number;
	komisi_idr: number;
}

export interface EstimasiPayout {
	baris: RincianBaris[];
	subtotal_idr: number;
	komisi_idr: number;
	penalti_idr: number;
	payout_idr: number;
}

export function estimasiPayout(baris: readonly BarisPesanan[], k: KonteksTarif, penaltiIdr = 0): EstimasiPayout {
	wajibIntegerNonNegatif(penaltiIdr, 'penalti');
	const rinci = baris.map((b) => {
		const tarif = tarifUntukBaris(b, k);
		const subtotal = b.harga_idr * b.qty;
		wajibIntegerNonNegatif(subtotal, 'subtotal');
		return { ...b, tarif_persen: tarif, subtotal_idr: subtotal, komisi_idr: komisiBaris(b.harga_idr, b.qty, tarif) };
	});
	const subtotal = rinci.reduce((s, r) => s + r.subtotal_idr, 0);
	const komisi = rinci.reduce((s, r) => s + r.komisi_idr, 0);
	return { baris: rinci, subtotal_idr: subtotal, komisi_idr: komisi, penalti_idr: penaltiIdr, payout_idr: subtotal - komisi - penaltiIdr };
}

export function formatRupiah(n: number): string {
	return `Rp${n.toLocaleString('id-ID')}`;
}
