import { describe, expect, it } from 'vitest';
import { GalatApi } from '../../src/lib/api/pasaree';
import { INFO_REFUND_OTOMATIS, buatKlienOperasional, pesanGalat } from '../../src/lib/api/operasional';
import { buatPemanggil } from '../../src/lib/api/pemanggil';

function rakit(respons: { status: number; body?: unknown }) {
	const panggilan: { url: string; init: RequestInit }[] = [];
	const f = (async (url: string, init: RequestInit) => {
		panggilan.push({ url, init });
		return new Response(respons.body === undefined ? '' : JSON.stringify(respons.body), { status: respons.status });
	}) as unknown as typeof fetch;
	const klien = buatKlienOperasional(buatPemanggil({ baseUrl: 'http://be/', token: 'T', fetch: f }));
	return { klien, panggilan };
}

describe('klien operasional', () => {
	it('PATCH stok dan harga mengirim badan sesuai openapi', async () => {
		const a = rakit({ status: 200, body: { stok: 5, status_produk: 'TAYANG' } });
		await a.klien.ubahStok('v 1', 5, 'restok');
		expect(a.panggilan[0].url).toBe('http://be/web/varian/v%201/stok');
		expect(a.panggilan[0].init.method).toBe('PATCH');
		expect(JSON.parse(a.panggilan[0].init.body as string)).toEqual({ stok: 5, alasan: 'restok' });
		const b = rakit({ status: 200, body: { harga_idr: 13000, kurasi_ulang_ringan: true } });
		expect((await b.klien.ubahHarga('v1', 13000)).kurasi_ulang_ringan).toBe(true);
	});
	it('konfirmasi dan serah-trip membawa Idempotency-Key', async () => {
		const a = rakit({ status: 200, body: { status: 'DIKONFIRMASI_LAPAK' } });
		await a.klien.konfirmasi('s1', true, undefined, 'k-1');
		const h = a.panggilan[0].init.headers as Record<string, string>;
		expect(h['Idempotency-Key']).toBe('k-1');
		expect(JSON.parse(a.panggilan[0].init.body as string)).toEqual({ terima: true });
		const b = rakit({ status: 200, body: { status: 'DISERAHKAN_KE_TRIP' } });
		await b.klien.serahTrip('s1', 'TRP-1', 'KODE', 'k-2');
		expect(JSON.parse(b.panggilan[0].init.body as string)).toEqual({ trip_id: 'TRP-1', kode_serah: 'KODE' });
	});
	it('409 STOK_HABIS menampilkan stok terkini bila ada di detail', async () => {
		const a = rakit({ status: 409, body: { kode: 'STOK_HABIS', pesan: 'Stok berubah.', detail: { stok_terkini: 3 } } });
		const e = await a.klien.ubahStok('v1', 9, 'x').catch((x) => x);
		expect(e).toBeInstanceOf(GalatApi);
		expect(pesanGalat(e)).toEqual({ pesan: 'Stok habis. Stok terkini: 3.', stokTerkini: 3 });
		expect(pesanGalat(new GalatApi(409, { kode: 'STOK_HABIS', pesan: 'x' })).pesan).toBe('Stok habis.');
	});
	it('galat lain memakai pesan server atau pesan jaringan', () => {
		expect(pesanGalat(new GalatApi(422, { kode: 'VALIDASI_GAGAL', pesan: 'Harga tak sah.' })).pesan).toBe('Harga tak sah.');
		expect(pesanGalat(new Error('x')).pesan).toMatch(/jaringan/);
		expect(INFO_REFUND_OTOMATIS).toMatch(/kasir/);
	});
});
