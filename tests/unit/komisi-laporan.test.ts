import { describe, expect, it } from 'vitest';
import {
	dalamPromoLapakBaru,
	estimasiPayout,
	formatRupiah,
	komisiBaris,
	tarifUntukBaris
} from '../../src/lib/komisi/hitung';
import {
	bangunCsv,
	namaBerkas,
	pengumumanAktif,
	periodeSah,
	rentangPeriode,
	selCsv
} from '../../src/lib/laporan/csv';

const sekarang = new Date('2026-10-21T05:00:00Z');

describe('komisi per baris (floor, integer)', () => {
	it('8% dibulatkan ke bawah', () => {
		expect(komisiBaris(25000, 1, 8)).toBe(2000);
		expect(komisiBaris(12500, 3, 8)).toBe(3000); // 37500*8/100 = 3000
		expect(komisiBaris(10250, 1, 8)).toBe(820); // 820.0
		expect(komisiBaris(1500, 1, 8)).toBe(120);
		expect(komisiBaris(333, 1, 8)).toBe(26); // 26.64 -> 26
	});
	it('tarif 0 dan qty 0 menghasilkan 0', () => {
		expect(komisiBaris(5000, 2, 0)).toBe(0);
		expect(komisiBaris(5000, 0, 8)).toBe(0);
	});
	it('menolak masukan non-integer atau negatif', () => {
		expect(() => komisiBaris(100.5, 1, 8)).toThrow(RangeError);
		expect(() => komisiBaris(100, -1, 8)).toThrow(RangeError);
		expect(() => komisiBaris(100, 1, 8.5)).toThrow(RangeError);
	});
	it('tidak kehilangan presisi pada nilai besar', () => {
		expect(komisiBaris(9_000_000, 1000, 8)).toBe(720_000_000);
	});
});

describe('pemilihan tarif', () => {
	it('default 8%, hampers 10%, promo lapak baru 5%', () => {
		const lama = { sekarang, produkPertamaTayang: new Date('2026-01-01T00:00:00Z') };
		expect(tarifUntukBaris({ harga_idr: 1, qty: 1 }, lama)).toBe(8);
		expect(tarifUntukBaris({ harga_idr: 1, qty: 1, kategori_kode: 'paket-hampers' }, lama)).toBe(10);
		expect(tarifUntukBaris({ harga_idr: 1, qty: 1 }, { sekarang, produkPertamaTayang: new Date('2026-10-01T00:00:00Z') })).toBe(5);
		expect(tarifUntukBaris({ harga_idr: 1, qty: 1 }, { sekarang, tarifDefaultPersen: 9 })).toBe(9);
	});
	it('promo 30 hari: hari ke-29 masuk, tepat 30 hari keluar, belum tayang tidak', () => {
		const mulai = new Date('2026-09-21T05:00:00Z');
		expect(dalamPromoLapakBaru(mulai, new Date('2026-10-20T05:00:00Z'))).toBe(true);
		expect(dalamPromoLapakBaru(mulai, new Date('2026-10-21T05:00:00Z'))).toBe(false);
		expect(dalamPromoLapakBaru(null, sekarang)).toBe(false);
		expect(dalamPromoLapakBaru(new Date('2026-11-01T00:00:00Z'), sekarang)).toBe(false);
	});
});

describe('estimasi payout', () => {
	it('payout = subtotal - sum(komisi_baris) - penalti', () => {
		const e = estimasiPayout(
			[
				{ harga_idr: 25000, qty: 2 }, // 50000, komisi 4000
				{ harga_idr: 333, qty: 1, kategori_kode: 'paket-hampers' } // 333, komisi floor(33.3)=33
			],
			{ sekarang },
			1000
		);
		expect(e.subtotal_idr).toBe(50333);
		expect(e.komisi_idr).toBe(4033);
		expect(e.penalti_idr).toBe(1000);
		expect(e.payout_idr).toBe(50333 - 4033 - 1000);
		expect(e.baris.map((b) => b.tarif_persen)).toEqual([8, 10]);
	});
	it('keranjang kosong menghasilkan nol', () => {
		expect(estimasiPayout([], { sekarang })).toMatchObject({ subtotal_idr: 0, komisi_idr: 0, payout_idr: 0 });
	});
	it('floor per baris bukan floor total', () => {
		const e = estimasiPayout([{ harga_idr: 333, qty: 1 }, { harga_idr: 333, qty: 1 }], { sekarang });
		expect(e.komisi_idr).toBe(52); // 26 + 26, bukan floor(53.28)=53
	});
	it('menolak penalti negatif dan memformat rupiah', () => {
		expect(() => estimasiPayout([], { sekarang }, -1)).toThrow(RangeError);
		expect(formatRupiah(0)).toBe('Rp0');
	});
});

describe('CSV laporan', () => {
	const baris = {
		pesanan_id: 'P1',
		escrow_id: 'E1',
		subtotal: 50000,
		komisi: 4000,
		ongkir: 8000,
		payout: 46000,
		status: 'SELESAI'
	};
	it('header kolom baku dan CRLF', () => {
		const csv = bangunCsv([baris]);
		expect(csv.split('\r\n')[0]).toBe('pesanan_id,escrow_id,subtotal,komisi,ongkir,payout,status');
		expect(csv.split('\r\n')[1]).toBe('P1,E1,50000,4000,8000,46000,SELESAI');
		expect(csv.endsWith('\r\n')).toBe(true);
	});
	it('tanpa data hanya header', () => {
		expect(bangunCsv([])).toBe('pesanan_id,escrow_id,subtotal,komisi,ongkir,payout,status\r\n');
	});
	it('escape koma/kutip dan cegah CSV injection', () => {
		expect(selCsv('a,b')).toBe('"a,b"');
		expect(selCsv('ia "x"')).toBe('"ia ""x"""');
		expect(selCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
		expect(selCsv('+1')).toBe("'+1");
		expect(selCsv(-5)).toBe('-5'); // angka sungguhan tidak diubah
	});
	it('rentang periode dan nama berkas', () => {
		const h = rentangPeriode('harian', sekarang);
		expect(h.mulai.toISOString()).toBe('2026-10-21T00:00:00.000Z');
		expect(h.akhir.toISOString()).toBe('2026-10-22T00:00:00.000Z');
		expect(rentangPeriode('mingguan', sekarang).mulai.toISOString()).toBe('2026-10-15T00:00:00.000Z');
		const b = rentangPeriode('bulanan', sekarang);
		expect([b.mulai.toISOString(), b.akhir.toISOString()]).toEqual(['2026-10-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z']);
		expect(namaBerkas('bulanan', sekarang)).toBe('laporan-lapak-bulanan-2026-10-21.csv');
		expect(periodeSah('harian')).toBe(true);
		expect(periodeSah('tahunan')).toBe(false);
		expect(periodeSah(null)).toBe(false);
	});
});

describe('pengumuman tarif 14 hari', () => {
	it('tampil mulai 14 hari sebelum hingga hari berlaku, urut tanggal', () => {
		const daftar = [
			{ tarif_persen: 9, berlaku_mulai: '2026-11-04' }, // tepat 14 hari
			{ tarif_persen: 7, berlaku_mulai: '2026-11-05' }, // 15 hari: belum
			{ tarif_persen: 8, berlaku_mulai: '2026-10-21' }, // hari ini
			{ tarif_persen: 6, berlaku_mulai: '2026-10-20' } // sudah lewat
		];
		expect(pengumumanAktif(daftar, sekarang).map((p) => p.tarif_persen)).toEqual([8, 9]);
	});
});
