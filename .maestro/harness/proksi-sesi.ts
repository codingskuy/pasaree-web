// Proksi dev di depan Vite: menyuntikkan cookie httpOnly `psr_akses` (token uji) agar halaman
// bersesi tanpa mengubah kode produk. Hanya untuk uji lokal; token fiktif.
const hulu = `http://127.0.0.1:${process.env.VITE_PORT ?? 18932}`;
const port = Number(process.env.PROXY_PORT ?? 18930);

Bun.serve({
	port,
	async fetch(r) {
		const u = new URL(r.url);
		const h = new Headers(r.headers);
		h.delete('accept-encoding');
		const res = await fetch(hulu + u.pathname + u.search, {
			method: r.method,
			headers: h,
			body: r.body,
			redirect: 'manual'
		});
		const out = new Response(res.body, { status: res.status, headers: res.headers });
		if (!(r.headers.get('cookie') ?? '').includes('psr_akses='))
			out.headers.append('set-cookie', 'psr_akses=token-uji-maestro; Path=/; HttpOnly; SameSite=Lax');
		return out;
	}
});
console.log(`[proksi] siap di :${port} -> ${hulu}`);
