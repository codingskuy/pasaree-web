import { describe, expect, it } from 'vitest';
import {
	formKosong,
	hargaValid,
	kesalahanDari422,
	kesalahanDariCek,
	petaKesalahan,
	validasiDraf,
	validasiMedia,
	type FormDraf
} from '../../src/lib/produk/validasi';

function formSah(): FormDraf {
	return {
		...formKosong(),
		judul: 'Keripik Tempe Pedas 250 g',
		kategori_kode: 'pangan-olahan',
		tag: ['pedas'],
		komposisi: 'Tempe, tepung, cabai',
		alergen: ['kedelai'],
		varian: [{ nama_varian: 'Original', sku: 'KT-250', harga_idr: 25000, stok: 10, satuan: 'g', berat_kirim_gram: 300 }]
	};
}

describe('validasiDraf', () => {
	it('formulir sah tanpa kesalahan', () => {
		expect(validasiDraf(formSah())).toEqual([]);
	});
	it('judul 10-80 karakter dan memuat berat/isi', () => {
		const f = formSah();
		f.judul = 'Pendek';
		expect(validasiDraf(f).map((e) => e.kolom)).toContain('judul');
		f.judul = 'Keripik tempe enak sekali';
		expect(petaKesalahan(validasiDraf(f)).judul).toMatch(/berat\/isi/);
		f.judul = 'a'.repeat(81);
		expect(validasiDraf(f).map((e) => e.kolom)).toContain('judul');
	});
	it('kategori dari 6 kode baku, maks 2 tag baku', () => {
		const f = formSah();
		f.kategori_kode = '';
		f.tag = ['pedas', 'manis', 'vegan'];
		const kolom = validasiDraf(f).map((e) => e.kolom);
		expect(kolom).toContain('kategori_kode');
		expect(kolom).toContain('tag');
	});
	it('harga harus kelipatan Rp500, integer, > 0', () => {
		expect(hargaValid(25000)).toBe(true);
		expect(hargaValid(25250)).toBe(false);
		expect(hargaValid(0)).toBe(false);
		expect(hargaValid(500.5)).toBe(false);
		const f = formSah();
		f.varian[0].harga_idr = 12300;
		expect(petaKesalahan(validasiDraf(f))['varian[0].harga_idr']).toMatch(/Rp500/);
	});
	it('SKU kembar dan SKU kosong ditandai', () => {
		const f = formSah();
		f.varian.push({ ...f.varian[0] });
		expect(petaKesalahan(validasiDraf(f))['varian[1].sku']).toMatch(/kembar/);
	});
	it('pangan wajib komposisi dan alergen; kerajinan tidak', () => {
		const f = formSah();
		f.komposisi = '';
		f.alergen = [];
		expect(validasiDraf(f).map((e) => e.kolom)).toEqual(expect.arrayContaining(['komposisi', 'alergen']));
		f.kategori_kode = 'kerajinan-pangan';
		expect(validasiDraf(f)).toEqual([]);
	});
});

describe('kesalahan server (cek_otomatis dan 422)', () => {
	it('cek_otomatis tidak lolos diubah jadi daftar kolom', () => {
		const cek = { lolos: false, kesalahan: [{ kolom: 'judul', pesan: 'Terlalu mirip produk lain.' }] };
		expect(kesalahanDariCek(cek)).toEqual(cek.kesalahan);
		expect(kesalahanDariCek({ lolos: true, kesalahan: [] })).toEqual([]);
		expect(kesalahanDariCek(null)).toEqual([]);
	});
	it('detail 422 yang tak dikenal tidak membuat galat', () => {
		expect(kesalahanDari422(undefined)).toEqual([]);
		expect(kesalahanDari422({ kesalahan: 'x' })).toEqual([]);
		expect(kesalahanDari422({ kesalahan: [{ kolom: 'harga', pesan: 'salah' }, 5] })).toEqual([
			{ kolom: 'harga', pesan: 'salah' }
		]);
	});
});

describe('validasiMedia', () => {
	it('foto: <=5 MB, min 800x800, maks 6', () => {
		expect(validasiMedia({ jenis: 'FOTO', ukuran_byte: 1e6, lebar: 800, tinggi: 800 }, 0)).toEqual([]);
		expect(validasiMedia({ jenis: 'FOTO', ukuran_byte: 6 * 1024 * 1024, lebar: 800, tinggi: 800 }, 0)).toHaveLength(1);
		expect(validasiMedia({ jenis: 'FOTO', ukuran_byte: 1e6, lebar: 799, tinggi: 900 }, 0)).toHaveLength(1);
		expect(validasiMedia({ jenis: 'FOTO', ukuran_byte: 1e6, lebar: 900, tinggi: 900 }, 6)).toHaveLength(1);
	});
	it('video: <=50 MB dan <=30 detik', () => {
		expect(validasiMedia({ jenis: 'VIDEO', ukuran_byte: 10e6, durasi_detik: 30 }, 0)).toEqual([]);
		expect(validasiMedia({ jenis: 'VIDEO', ukuran_byte: 51 * 1024 * 1024, durasi_detik: 31 }, 0)).toHaveLength(2);
	});
});
