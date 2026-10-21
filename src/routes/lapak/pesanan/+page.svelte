<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { bolehKonfirmasi, sisaKonfirmasi } from '$lib/operasional/aturan';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let sekarang = $state(new Date());
	onMount(() => {
		const t = setInterval(() => (sekarang = new Date()), 30_000);
		return () => clearInterval(t);
	});
	const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
</script>

<main>
	<h1>Pesanan Masuk</h1>
	{#if data.galat}<p role="alert">{data.galat}</p>{/if}
	{#if form?.info}<p role="status">{form.info}</p>{/if}
	{#if form?.galat}<p role="alert">{form.galat}</p>{/if}

	{#each data.pesanan as p (p.sub_id)}
		{@const sisa = sisaKonfirmasi(p.batas_konfirmasi_hingga, sekarang)}
		{@const izin = bolehKonfirmasi(p.batas_konfirmasi_hingga, sekarang)}
		<article>
			<h2>Pesanan {p.pesanan_id}</h2>
			<p>{p.varian.map((v) => `${v.sku} × ${v.qty}`).join(', ')} — {rupiah(p.total_idr)}</p>
			<p>Batas konfirmasi: <time datetime={p.batas_konfirmasi_hingga}>{p.batas_konfirmasi_hingga}</time> ({sisa.label})</p>
			{#if !izin.boleh}<p>{izin.alasan}</p>{/if}

			<form method="POST" action="?/konfirmasi" use:enhance>
				<input type="hidden" name="sub_id" value={p.sub_id} />
				<input type="hidden" name="kunci" value={`konf-${p.sub_id}`} />
				<button name="terima" value="true" disabled={!izin.boleh}>Terima</button>
				<input name="alasan" placeholder="Alasan bila menolak" />
				<button name="terima" value="false" disabled={!izin.boleh}>Tolak</button>
			</form>

			<form method="POST" action="?/serah" use:enhance>
				<input type="hidden" name="sub_id" value={p.sub_id} />
				<input type="hidden" name="kunci" value={`serah-${p.sub_id}`} />
				<label>Trip <input name="trip_id" value={p.trip_id} required /></label>
				<label>Kode serah <input name="kode_serah" required autocomplete="off" /></label>
				<button>Serahkan ke trip</button>
			</form>
		</article>
	{:else}
		<p>Belum ada pesanan masuk.</p>
	{/each}
</main>
