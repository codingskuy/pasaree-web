import { describe, expect, it } from 'vitest';
import {
	bolehKonfirmasi,
	dalamJamKerja,
	hargaSah,
	memicuKurasiUlang,
	pratinjauHarga,
	sisaKonfirmasi,
	stokSah
} from '../../src/lib/operasional/aturan';

// WIB = UTC+7. 08:00 WIB = 01:00Z.
const wib = (jam: number, menit = 0) => new Date(Date.UTC(2026, 9, 21, jam - 7, menit));

describe('harga dan stok', () => {
	it('harga kelipatan Rp500 integer > 0', () => {
		expect(hargaSah(1000)).toBe(true);
		expect(hargaSah(1250)).toBe(false);
		expect(hargaSah(0)).toBe(false);
		expect(hargaSah(-500)).toBe(false);
	});
	it('stok integer >= 0', () => {
		expect(stokSah(0)).toBe(true);
		expect(stokSah(-1)).toBe(false);
		expect(stokSah(1.5)).toBe(false);
	});
	it('kenaikan harga TEPAT 20% tidak memicu, >20% memicu, turun tidak', () => {
		expect(memicuKurasiUlang(10000, 12000)).toBe(false);
		expect(memicuKurasiUlang(10000, 12500)).toBe(true);
		expect(memicuKurasiUlang(10000, 8000)).toBe(false);
		expect(memicuKurasiUlang(0, 5000)).toBe(false);
	});
	it('pratinjau menandai kurasi ulang dan menolak harga tak sah', () => {
		expect(pratinjauHarga(10000, 13000)).toEqual({ sah: true, kurasiUlang: true });
		expect(pratinjauHarga(10000, 10100).sah).toBe(false);
	});
});

describe('jam kerja dan batas konfirmasi', () => {
	it('07.00 masuk, 18.59 masuk, 19.00 dan 06.59 di luar (WIB)', () => {
		expect(dalamJamKerja(wib(7))).toBe(true);
		expect(dalamJamKerja(wib(18, 59))).toBe(true);
		expect(dalamJamKerja(wib(19))).toBe(false);
		expect(dalamJamKerja(wib(6, 59))).toBe(false);
	});
	it('sisa waktu dihitung dari batas_konfirmasi_hingga', () => {
		const batas = wib(10).toISOString();
		expect(sisaKonfirmasi(batas, wib(8, 30))).toMatchObject({ kedaluwarsa: false, menit: 90, label: '1 jam 30 menit lagi' });
		expect(sisaKonfirmasi(batas, wib(9, 45)).label).toBe('15 menit lagi');
		expect(sisaKonfirmasi(batas, wib(10)).kedaluwarsa).toBe(true);
		expect(sisaKonfirmasi('bukan-tanggal', wib(10)).kedaluwarsa).toBe(true);
	});
	it('boleh konfirmasi hanya sebelum batas dan dalam jam kerja', () => {
		expect(bolehKonfirmasi(wib(10).toISOString(), wib(9))).toEqual({ boleh: true });
		expect(bolehKonfirmasi(wib(10).toISOString(), wib(11)).boleh).toBe(false);
		expect(bolehKonfirmasi(wib(21).toISOString(), wib(20)).alasan).toMatch(/jam kerja/);
	});
});
