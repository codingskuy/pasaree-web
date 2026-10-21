import type { PresignedRequest, PresignedResponse } from '$lib/api/pasaree';
import { validasiMedia, type BerkasMedia } from './validasi';

export interface PenggunggahMedia {
	/** Meminta presigned URL ke proksi server (token tidak di browser). */
	mintaPresigned: (r: PresignedRequest) => Promise<PresignedResponse>;
	/** PUT biner ke `unggah_url`. */
	put: (url: string, isi: Blob, tipeMime: string) => Promise<void>;
}

export class GalatMedia extends Error {
	constructor(readonly alasan: string[]) {
		super(alasan.join(' '));
		this.name = 'GalatMedia';
	}
}

/** Validasi lokal -> presigned -> PUT. Mengembalikan `media_url` untuk disimpan pada draf. */
export async function unggahMedia(
	p: PenggunggahMedia,
	isi: Blob,
	meta: BerkasMedia & { nama_berkas: string; tipe_mime: string },
	jumlahFotoSaatIni: number
): Promise<string> {
	const alasan = validasiMedia(meta, jumlahFotoSaatIni);
	if (alasan.length > 0) throw new GalatMedia(alasan);
	const izin = await p.mintaPresigned({
		nama_berkas: meta.nama_berkas,
		tipe_mime: meta.tipe_mime,
		ukuran_byte: meta.ukuran_byte
	});
	await p.put(izin.unggah_url, isi, meta.tipe_mime);
	return izin.media_url;
}
