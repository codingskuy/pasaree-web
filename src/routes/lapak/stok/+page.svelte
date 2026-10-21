<script lang="ts">
	import { enhance } from '$app/forms';
	import { memicuKurasiUlang } from '$lib/operasional/aturan';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let hargaLama = $state(0);
	let hargaBaru = $state(0);
	const perluKurasi = $derived(memicuKurasiUlang(hargaLama, hargaBaru));
</script>

<main>
	<h1>Stok dan Harga</h1>
	{#if form?.galat}<p role="alert">{form.galat}</p>{/if}
	{#if form && 'stok' in form}<p role="status">Stok tersimpan: {form.stok} ({form.statusProduk}).</p>{/if}
	{#if form?.hargaIdr !== undefined}
		<p role="status">
			Harga tersimpan: Rp{(form.hargaIdr ?? 0).toLocaleString('id-ID')}.
			{#if form.kurasiUlang}Kenaikan &gt; 20%: produk masuk kurasi ulang ringan dan tercatat di riwayat.{/if}
		</p>
	{/if}

	<form method="POST" action="?/stok" use:enhance>
		<h2>Ubah stok</h2>
		<label>ID varian <input name="varian_id" required /></label>
		<label>Stok <input name="stok" type="number" min="0" required /></label>
		<label>Alasan <input name="alasan" /></label>
		<button>Simpan stok</button>
	</form>

	<form method="POST" action="?/harga" use:enhance>
		<h2>Ubah harga</h2>
		<label>ID varian <input name="varian_id" required /></label>
		<label>Harga saat ini <input name="harga_lama" type="number" bind:value={hargaLama} /></label>
		<label>Harga baru (kelipatan Rp500) <input name="harga_idr" type="number" step="500" bind:value={hargaBaru} required /></label>
		{#if perluKurasi}<p>Kenaikan harga &gt; 20% akan memicu kurasi ulang ringan.</p>{/if}
		<button>Simpan harga</button>
	</form>
</main>
