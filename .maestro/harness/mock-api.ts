// Mock backend minimal untuk alur Maestro: meniru bentuk respons docs/api/openapi.yaml
// (POST /web/produk/draf, PUT /web/produk/{id}, POST /web/produk/{id}/ajukan-kurasi). Tanpa jaringan keluar.
const port = Number(process.env.MOCK_PORT ?? 18931);
const ID = '01J0000000000000000000002';
export const permintaan: { m: string; p: string; auth: string | null }[] = [];

Bun.serve({
	port,
	async fetch(r) {
		const u = new URL(r.url);
		permintaan.push({ m: r.method, p: u.pathname, auth: r.headers.get('authorization') });
		console.log(`[mock-api] ${r.method} ${u.pathname} auth=${r.headers.get('authorization') ? 'ada' : 'tidak'}`);
		if (!r.headers.get('authorization')?.startsWith('Bearer '))
			return Response.json({ kode: 'TIDAK_TERAUTENTIKASI', pesan: 'Token wajib.' }, { status: 401 });
		if (r.method === 'POST' && u.pathname === '/web/produk/draf')
			return Response.json({ produk_id: ID, status: 'DRAF' }, { status: 201 });
		if (r.method === 'PUT' && u.pathname === `/web/produk/${ID}`)
			return Response.json({ produk_id: ID, cek_otomatis: { lolos: true, kesalahan: [] } });
		if (r.method === 'POST' && u.pathname === `/web/produk/${ID}/ajukan-kurasi`)
			return Response.json({ status: 'MENUNGGU_KURASI', estimasi_sla: '2026-10-24T17:00:00Z' });
		return Response.json({ kode: 'TIDAK_DITEMUKAN', pesan: 'Rute mock tidak ada.' }, { status: 404 });
	}
});
console.log(`[mock-api] siap di :${port}`);
