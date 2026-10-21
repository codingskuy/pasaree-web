<script lang="ts">
	import { enhance } from '$app/forms';
	import { MIN_HARI_BERLAKU_KOMISI } from '$lib/kurasi/aturan';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const galat = $derived((form && 'galat' in form ? form.galat : {}) as Record<string, string>);
</script>

<main>
	<h1>Tarif Komisi Default</h1>
	<p>Perubahan diumumkan ke semua lapak aktif dan berlaku minimal {MIN_HARI_BERLAKU_KOMISI} hari setelah hari ini.</p>
	{#if form && 'tarif' in form}
		<p role="status">Tercatat: tarif {form.tarif}% berlaku mulai {form.berlakuMulai}.</p>
	{/if}
	<form method="POST" action="?/ubah" use:enhance>
		<label>Tarif default (%) <input name="tarif_default_persen" type="number" min="0" max="100" step="1" required /></label>
		{#if galat.tarif_default_persen}<p role="alert">{galat.tarif_default_persen}</p>{/if}
		<label>Berlaku mulai <input name="berlaku_mulai" type="date" required /></label>
		{#if galat.berlaku_mulai}<p role="alert">{galat.berlaku_mulai}</p>{/if}
		{#if galat.server}<p role="alert">{galat.server}</p>{/if}
		<button>Simpan</button>
	</form>
</main>
