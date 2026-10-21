import { MatchersV3, PactV4, SpecificationVersion } from '@pact-foundation/pact';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GalatApi, buatKlienPasaree } from '../../src/lib/api/pasaree';

const { like, eachLike, integer, regex, datetime } = MatchersV3;

const pact = new PactV4({
	consumer: 'pasaree-web',
	provider: 'pasaree-backend-service',
	dir: path.resolve(process.cwd(), 'pacts'),
	spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
	logLevel: 'warn'
});

const TOKEN = 'token-uji';
const auth = { Authorization: `Bearer ${TOKEN}` };
const ULID = '01J0000000000000000000001';

describe('kontrak konsumen: web lapak', () => {
	it('GET /web/lapak-saya mengembalikan lapak milik akun', async () => {
		await pact
			.addInteraction()
			.given('akun produsen memiliki satu lapak aktif')
			.uponReceiving('daftar lapak saya')
			.withRequest('GET', '/web/lapak-saya', (b) => b.headers(auth))
			.willRespondWith(200, (b) =>
				b.jsonBody({
					data: eachLike({
						id: ULID,
						nama_lapak: 'Lapak Contoh Sleman',
						slug: 'lapak-contoh',
						status: regex(/^(AKTIF|BEKU|TUTUP)$/, 'AKTIF'),
						skor_fulfillment_persen: integer(95),
						saldo_tertahan_idr: integer(0)
					})
				})
			)
			.executeTest(async (mock) => {
				const klien = buatKlienPasaree({ baseUrl: mock.url, token: TOKEN });
				const res = await klien.lapakSaya();
				expect(res.data[0].slug).toBe('lapak-contoh');
				expect(Number.isInteger(res.data[0].saldo_tertahan_idr)).toBe(true);
			});
	});

	it('POST /web/produk/draf membuat draf (201)', async () => {
		const payload = {
			lapak_id: ULID,
			judul: 'Sambal Bawang Mbok D 150 g',
			kategori_kode: 'bumbu-dapur' as const,
			tag: ['pedas' as const],
			deskripsi: 'Sambal bawang buatan rumahan dengan cabai pilihan, tanpa pengawet, tahan 3 bulan.'
		};
		await pact
			.addInteraction()
			.given('lapak milik akun ada')
			.uponReceiving('buat draf produk')
			.withRequest('POST', '/web/produk/draf', (b) =>
				b
					.headers({
						...auth,
						'Idempotency-Key': '6f1c2c1e-6c1e-4c2e-9a3b-2f1c2c1e6c1e',
						'Content-Type': 'application/json'
					})
					.jsonBody(payload)
			)
			.willRespondWith(201, (b) =>
				b.jsonBody({ produk_id: like('01J0000000000000000000002'), status: 'DRAF' })
			)
			.executeTest(async (mock) => {
				const klien = buatKlienPasaree({ baseUrl: mock.url, token: TOKEN });
				const res = await klien.buatDraf(payload, '6f1c2c1e-6c1e-4c2e-9a3b-2f1c2c1e6c1e');
				expect(res.status).toBe('DRAF');
			});
	});

	it('PUT /web/produk/{id} mengembalikan hasil cek otomatis dengan kolom bermasalah', async () => {
		const payload = { judul: 'Sambal' };
		await pact
			.addInteraction()
			.given('produk draf 01J0000000000000000000002 ada')
			.uponReceiving('ubah draf, cek otomatis gagal')
			.withRequest('PUT', '/web/produk/01J0000000000000000000002', (b) =>
				b.headers({ ...auth, 'Content-Type': 'application/json' }).jsonBody(payload)
			)
			.willRespondWith(200, (b) =>
				b.jsonBody({
					produk_id: '01J0000000000000000000002',
					cek_otomatis: {
						lolos: false,
						kesalahan: eachLike({ kolom: 'judul', pesan: 'Judul minimal 10 karakter.' })
					}
				})
			)
			.executeTest(async (mock) => {
				const klien = buatKlienPasaree({ baseUrl: mock.url, token: TOKEN });
				const res = await klien.ubahProduk('01J0000000000000000000002', payload);
				expect(res.cek_otomatis.lolos).toBe(false);
				expect(res.cek_otomatis.kesalahan[0].kolom).toBe('judul');
			});
	});

	it('POST /web/produk/{id}/ajukan-kurasi sukses (200)', async () => {
		await pact
			.addInteraction()
			.given('produk draf 01J0000000000000000000003 lolos cek otomatis')
			.uponReceiving('ajukan kurasi')
			.withRequest('POST', '/web/produk/01J0000000000000000000003/ajukan-kurasi', (b) =>
				b.headers(auth)
			)
			.willRespondWith(200, (b) =>
				b.jsonBody({
					status: 'MENUNGGU_KURASI',
					estimasi_sla: datetime("yyyy-MM-dd'T'HH:mm:ss'Z'", '2026-10-06T17:00:00Z')
				})
			)
			.executeTest(async (mock) => {
				const klien = buatKlienPasaree({ baseUrl: mock.url, token: TOKEN });
				const res = await klien.ajukanKurasi('01J0000000000000000000003');
				expect(res.status).toBe('MENUNGGU_KURASI');
			});
	});

	it('POST /web/produk/{id}/ajukan-kurasi gagal cek otomatis (422, skema Error)', async () => {
		await pact
			.addInteraction()
			.given('produk draf 01J0000000000000000000004 gagal cek otomatis')
			.uponReceiving('ajukan kurasi ditolak cek otomatis')
			.withRequest('POST', '/web/produk/01J0000000000000000000004/ajukan-kurasi', (b) =>
				b.headers(auth)
			)
			.willRespondWith(422, (b) =>
				b.jsonBody({ kode: 'VALIDASI_GAGAL', pesan: like('Cek otomatis gagal.') })
			)
			.executeTest(async (mock) => {
				const klien = buatKlienPasaree({ baseUrl: mock.url, token: TOKEN });
				const err = await klien.ajukanKurasi('01J0000000000000000000004').catch((e) => e);
				expect(err).toBeInstanceOf(GalatApi);
				expect((err as GalatApi).status).toBe(422);
				expect((err as GalatApi).body?.kode).toBe('VALIDASI_GAGAL');
			});
	});

	it('POST /web/media/presigned mengembalikan URL unggah', async () => {
		const req = { nama_berkas: 'sambal-1.jpg', tipe_mime: 'image/jpeg', ukuran_byte: 1200000 };
		await pact
			.addInteraction()
			.given('akun produsen terautentikasi')
			.uponReceiving('minta URL presigned')
			.withRequest('POST', '/web/media/presigned', (b) =>
				b.headers({ ...auth, 'Content-Type': 'application/json' }).jsonBody(req)
			)
			.willRespondWith(200, (b) =>
				b.jsonBody({
					unggah_url: like('https://cdn.pasaree.example/put/abc'),
					media_url: like('https://cdn.pasaree.example/foto/abc.jpg'),
					kedaluwarsa: datetime("yyyy-MM-dd'T'HH:mm:ss'Z'", '2026-10-21T12:00:00Z')
				})
			)
			.executeTest(async (mock) => {
				const klien = buatKlienPasaree({ baseUrl: mock.url, token: TOKEN });
				const res = await klien.mintaPresigned(req);
				expect(res.unggah_url).toMatch(/^https:\/\//);
			});
	});

	it('401 memakai skema Error', async () => {
		await pact
			.addInteraction()
			.given('token kedaluwarsa')
			.uponReceiving('daftar lapak tanpa token valid')
			.withRequest('GET', '/web/lapak-saya', (b) => b.headers(auth))
			.willRespondWith(401, (b) =>
				b.jsonBody({ kode: 'AUTH_KEDALUWARSA', pesan: like('Sesi berakhir.') })
			)
			.executeTest(async (mock) => {
				const klien = buatKlienPasaree({ baseUrl: mock.url, token: TOKEN });
				const err = await klien.lapakSaya().catch((e) => e);
				expect((err as GalatApi).status).toBe(401);
				expect((err as GalatApi).body?.kode).toBe('AUTH_KEDALUWARSA');
			});
	});
});
