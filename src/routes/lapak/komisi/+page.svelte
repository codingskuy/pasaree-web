<script lang="ts">
	import { estimasiPayout, formatRupiah, type BarisPesanan } from '$lib/komisi/hitung';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let baris = $state<(BarisPesanan & { kategori_kode: string })[]>([{ harga_idr: 25000, qty: 1, kategori_kode: '' }]);
	let penalti = $state(0);
	let produkPertama = $state('');

	const hasil = $derived.by(() => {
		try {
			return estimasiPayout(
				baris.map((b) => ({ ...b, kategori_kode: b.kategori_kode || undefined })),
				{ sekarang: new Date(), produkPertamaTayang: produkPertama ? new Date(produkPertama) : null },
				penalti
			);
		} catch {
			return null;
		}
	});
</script>

<main>
	<h1>Kalkulator Komisi</h1>
	<p>Perkiraan saja. Perhitungan resmi dilakukan di sistem kasir; komisi dipotong dari payout lapak, tidak dibebankan ke pembeli.</p>

	{#each data.pengumuman as p}
		<p role="status">Tarif default berubah menjadi {p.tarif_persen}% mulai {p.berlaku_mulai}.</p>
	{/each}

	<label>Produk pertama tayang (opsional, promo 5% selama 30 hari) <input type="date" bind:value={produkPertama} /></label>

	{#each baris as b, i}
		<fieldset>
			<legend>Baris {i + 1}</legend>
			<label>Harga (IDR) <input type="number" min="0" step="500" bind:value={b.harga_idr} /></label>
			<label>Jumlah <input type="number" min="0" bind:value={b.qty} /></label>
			<label>Kategori
				<select bind:value={b.kategori_kode}>
					<option value="">Umum</option>
					<option value="paket-hampers">paket-hampers</option>
				</select>
			</label>
		</fieldset>
	{/each}
	<button type="button" onclick={() => baris.push({ harga_idr: 0, qty: 1, kategori_kode: '' })}>Tambah baris</button>
	<label>Penalti (IDR) <input type="number" min="0" bind:value={penalti} /></label>

	{#if hasil}
		<dl>
			<dt>Subtotal</dt><dd>{formatRupiah(hasil.subtotal_idr)}</dd>
			<dt>Komisi</dt><dd>{formatRupiah(hasil.komisi_idr)}</dd>
			<dt>Penalti</dt><dd>{formatRupiah(hasil.penalti_idr)}</dd>
			<dt>Estimasi payout</dt><dd><strong>{formatRupiah(hasil.payout_idr)}</strong></dd>
		</dl>
	{:else}
		<p role="alert">Isi angka bulat tidak negatif.</p>
	{/if}

	<h2>Laporan</h2>
	{#if data.dataContoh}<p>Data laporan masih contoh sampai endpoint backend tersedia.</p>{/if}
	<ul>
		<li><a href="/lapak/laporan/csv?periode=harian" download>Unduh CSV harian</a></li>
		<li><a href="/lapak/laporan/csv?periode=mingguan" download>Unduh CSV mingguan</a></li>
		<li><a href="/lapak/laporan/csv?periode=bulanan" download>Unduh CSV bulanan</a></li>
	</ul>
</main>
