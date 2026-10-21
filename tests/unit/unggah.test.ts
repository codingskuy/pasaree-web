import { describe, expect, it, vi } from 'vitest';
import { GalatMedia, unggahMedia } from '../../src/lib/produk/unggah';

const meta = { jenis: 'FOTO' as const, ukuran_byte: 1e6, lebar: 1000, tinggi: 1000, nama_berkas: 'a.jpg', tipe_mime: 'image/jpeg' };

describe('unggahMedia', () => {
	it('presigned lalu PUT, mengembalikan media_url', async () => {
		const put = vi.fn(async () => {});
		const mintaPresigned = vi.fn(async () => ({ unggah_url: 'https://s3/u', media_url: 'https://cdn/m', kedaluwarsa: '2026-01-01T00:00:00Z' }));
		const url = await unggahMedia({ mintaPresigned, put }, new Blob(['x']), meta, 0);
		expect(url).toBe('https://cdn/m');
		expect(put).toHaveBeenCalledWith('https://s3/u', expect.any(Blob), 'image/jpeg');
	});
	it('berkas tidak sah ditolak sebelum memanggil server', async () => {
		const mintaPresigned = vi.fn();
		await expect(
			unggahMedia({ mintaPresigned, put: vi.fn() }, new Blob(), { ...meta, ukuran_byte: 9e6 }, 0)
		).rejects.toBeInstanceOf(GalatMedia);
		expect(mintaPresigned).not.toHaveBeenCalled();
	});
});
