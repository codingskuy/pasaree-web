<script lang="ts">
	import { enhance } from '$app/forms';
	import { ALASAN_BAKU, MAKS_CATATAN, AMBANG_NOTIFIKASI_ANTREAN } from '$lib/kurasi/aturan';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<main>
	<h1>Antrean Kurasi ({data.jumlah})</h1>
	{#if data.notifikasiKetua}
		<p role="alert">
			Antrean melebihi {AMBANG_NOTIFIKASI_ANTREAN} item: ketua TownHall perlu diberi tahu (notifikasi dipicu backend).
		</p>
	{/if}
	{#if form && 'status' in form}<p role="status">Keputusan tersimpan. Status produk: {form.status}.</p>{/if}

	{#each data.antrean as a (a.produk_id)}
		<article>
			<h2>{a.judul}</h2>
			<p>
				Menunggu {a.umur_antrean_jam} jam{#if a.prioritas_pangan_segar} — <strong>pangan segar (prioritas)</strong>{/if}
			</p>
			<form method="POST" action="?/putuskan" use:enhance>
				<input type="hidden" name="produk_id" value={a.produk_id} />
				<select name="keputusan" required>
					<option value="">— keputusan —</option>
					<option value="SETUJU">Setujui</option>
					<option value="REVISI">Revisi</option>
					<option value="TOLAK">Tolak</option>
				</select>
				<select name="alasan_baku">
					<option value="">— alasan baku —</option>
					{#each ALASAN_BAKU as al}<option value={al.kode}>{al.label}</option>{/each}
				</select>
				<textarea name="catatan" maxlength={MAKS_CATATAN} placeholder="Catatan (maks {MAKS_CATATAN} karakter)"></textarea>
				<button>Simpan keputusan</button>
				{#if form?.produkId === a.produk_id && form && 'galat' in form}
					{#each Object.values(form.galat ?? {}) as g}<p role="alert">{g}</p>{/each}
				{/if}
			</form>
		</article>
	{:else}
		<p>Antrean kosong.</p>
	{/each}
</main>
