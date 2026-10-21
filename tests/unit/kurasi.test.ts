import { describe, expect, it } from 'vitest';
import { ambilSemuaAntrean, buatKlienKurasi } from '../../src/lib/api/kurasi';
import { buatPemanggil } from '../../src/lib/api/pemanggil';
import {
	berlakuMulaiSah,
	perluNotifikasiKetua,
	urutkanAntrean,
	validasiKeputusan,
	validasiKomisi
} from '../../src/lib/kurasi/aturan';
import { boleh, peranDariToken } from '../../src/lib/kurasi/peran';

const item = (id: string, umur: number, segar = false) => ({ produk_id: id, judul: id, umur_antrean_jam: umur, prioritas_pangan_segar: segar });

describe('antrean', () => {
	it('FIFO dengan pangan segar didahulukan, stabil, tidak mengubah masukan', () => {
		const m = [item('a', 5), item('b', 30), item('c', 2, true), item('d', 9, true), item('e', 30)];
		const hasil = urutkanAntrean(m).map((x) => x.produk_id);
		expect(hasil).toEqual(['d', 'c', 'b', 'e', 'a']);
		expect(m.map((x) => x.produk_id)).toEqual(['a', 'b', 'c', 'd', 'e']);
	});
	it('notifikasi ketua hanya bila > 50', () => {
		expect(perluNotifikasiKetua(50)).toBe(false);
		expect(perluNotifikasiKetua(51)).toBe(true);
	});
	it('menelusuri halaman sampai cursor habis', async () => {
		const hal: Record<string, { data: ReturnType<typeof item>[]; cursor_lanjut: string | null }> = {
			'': { data: [item('1', 1)], cursor_lanjut: 'c2' },
			c2: { data: [item('2', 2)], cursor_lanjut: null }
		};
		const r = await ambilSemuaAntrean(async (c) => hal[c ?? '']);
		expect(r.map((x) => x.produk_id)).toEqual(['1', '2']);
	});
});

describe('keputusan kurasi', () => {
	it('SETUJU tanpa alasan sah', () => {
		expect(validasiKeputusan({ keputusan: 'SETUJU' })).toEqual({});
	});
	it('REVISI dan TOLAK wajib alasan baku', () => {
		expect(validasiKeputusan({ keputusan: 'REVISI' }).alasan_baku).toBeDefined();
		expect(validasiKeputusan({ keputusan: 'TOLAK', alasan_baku: 'FOTO_TIDAK_ASLI' })).toEqual({});
	});
	it('catatan maks 280 karakter', () => {
		expect(validasiKeputusan({ keputusan: 'SETUJU', catatan: 'x'.repeat(280) })).toEqual({});
		expect(validasiKeputusan({ keputusan: 'SETUJU', catatan: 'x'.repeat(281) }).catatan).toBeDefined();
	});
	it('keputusan kosong ditolak', () => {
		expect(validasiKeputusan({ keputusan: '' }).keputusan).toBeDefined();
	});
});

describe('komisi admin', () => {
	const hariIni = new Date('2026-10-21T10:00:00Z');
	it('berlaku_mulai minimal 14 hari ke depan', () => {
		expect(berlakuMulaiSah('2026-11-04', hariIni)).toBe(true);
		expect(berlakuMulaiSah('2026-11-03', hariIni)).toBe(false);
		expect(berlakuMulaiSah('2026-10-21', hariIni)).toBe(false);
		expect(berlakuMulaiSah('bukan', hariIni)).toBe(false);
		expect(berlakuMulaiSah('2026-02-31', hariIni)).toBe(false);
	});
	it('tarif integer 0-100', () => {
		expect(validasiKomisi(8, '2026-11-10', hariIni)).toEqual({});
		expect(validasiKomisi(8.5, '2026-11-10', hariIni).tarif_default_persen).toBeDefined();
		expect(validasiKomisi(101, '2026-11-10', hariIni).tarif_default_persen).toBeDefined();
		expect(validasiKomisi(8, '2026-10-25', hariIni).berlaku_mulai).toBeDefined();
	});
});

describe('peran', () => {
	it('tabel hak akses SOP §6', () => {
		expect(boleh('PRODUSEN', 'kurasi.ajukan')).toBe(true);
		expect(boleh('PRODUSEN', 'payout.ubah_rekening')).toBe(true);
		expect(boleh('OPERATOR', 'payout.ubah_rekening')).toBe(false);
		expect(boleh('OPERATOR', 'kurasi.ajukan')).toBe(false);
		expect(boleh('OPERATOR', 'draf.crud')).toBe(true);
		expect(boleh('KURATOR', 'kurasi.keputusan')).toBe(true);
		expect(boleh('KURATOR', 'komisi.ubah')).toBe(false);
		expect(boleh('ADMIN', 'komisi.ubah')).toBe(true);
		expect(boleh('ADMIN', 'kurasi.keputusan')).toBe(false);
		expect(boleh('PEMBELI', 'draf.crud')).toBe(false);
		expect(boleh(null, 'draf.crud')).toBe(false);
	});
	it('membaca klaim peran dari JWT', () => {
		const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
		expect(peranDariToken(`h.${b64({ peran: 'KURATOR', aud: 'pasaree' })}.s`)).toBe('KURATOR');
		expect(peranDariToken(`h.${b64({ peran: 'RAJA' })}.s`)).toBeNull();
		expect(peranDariToken('rusak')).toBeNull();
		expect(peranDariToken('h.@@@.s')).toBeNull();
	});
});

describe('klien kurasi', () => {
	it('keputusan dan komisi mengirim badan sesuai openapi', async () => {
		const k: { url: string; body: unknown; method?: string }[] = [];
		const f = (async (url: string, init: RequestInit) => {
			k.push({ url, body: JSON.parse(init.body as string), method: init.method });
			return new Response(JSON.stringify({ status: 'TAYANG', tarif_persen: 8, berlaku_mulai: '2026-11-10' }), { status: 200 });
		}) as unknown as typeof fetch;
		const c = buatKlienKurasi(buatPemanggil({ baseUrl: 'http://be', token: 't', fetch: f }));
		await c.putuskan('p/1', { keputusan: 'REVISI', alasan_baku: 'LABEL_KURANG', catatan: 'tambah label' });
		await c.ubahKomisi(8, '2026-11-10');
		expect(k[0]).toEqual({ url: 'http://be/web/kurasi/p%2F1/keputusan', method: 'POST', body: { keputusan: 'REVISI', alasan_baku: 'LABEL_KURANG', catatan: 'tambah label' } });
		expect(k[1]).toEqual({ url: 'http://be/web/admin/komisi', method: 'PATCH', body: { tarif_default_persen: 8, berlaku_mulai: '2026-11-10' } });
	});
});
