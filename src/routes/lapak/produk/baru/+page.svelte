<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { buatAutosave, outboxIndexedDB, outboxMemori, type Outbox } from '$lib/produk/autosave';
	import {
		KATEGORI,
		SATUAN,
		TAG_BAKU,
		MAKS_TAG,
		formKosong,
		petaKesalahan,
		validasiDraf,
		type FormDraf,
		type Kesalahan
	} from '$lib/produk/validasi';
	import type { Tag } from '$lib/api/pasaree';

	// TODO(PSR-WEB-002): lapak_id berasal dari /web/lapak-saya saat sesi tersedia; sementara dari query.
	let lapakId = $state('');
	let produkId = $state<string | undefined>(undefined);
	let form = $state<FormDraf>(formKosong());
	let kesalahanServer = $state<Kesalahan[]>([]);
	let status = $state('bersih');
	let pesan = $state('');
	const kunciIdempoten = crypto.randomUUID();
	const peta = $derived(petaKesalahan([...kesalahanServer]));

	async function kirim(ajukan: boolean) {
		const res = await fetch('/lapak/produk/simpan', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				lapak_id: lapakId,
				produk_id: produkId,
				kunci_idempoten: kunciIdempoten,
				form: $state.snapshot(form),
				ajukan
			})
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const j = await res.json();
		if (j.produk_id) produkId = j.produk_id;
		kesalahanServer = j.kesalahan ?? [];
		return j;
	}

	let outbox: Outbox<FormDraf> = outboxMemori();
	let autosave = $state.raw<ReturnType<typeof buatAutosave<FormDraf>> | undefined>(undefined);

	onMount(() => {
		lapakId = new URLSearchParams(location.search).get('lapak_id') ?? '';
		try {
			outbox = outboxIndexedDB<FormDraf>();
		} catch {
			/* IndexedDB tak tersedia: outbox memori */
		}
		autosave = buatAutosave<FormDraf>({
			kunci: 'draf-baru',
			outbox,
			simpan: async () => void (await kirim(false))
		});
		autosave.mulai();
	});
	onDestroy(() => autosave?.henti());

	$effect(() => {
		autosave?.ubah($state.snapshot(form));
		status = 'kotor';
	});

	async function ajukan() {
		pesan = '';
		const lokal = validasiDraf(form);
		if (lokal.length > 0) {
			kesalahanServer = lokal;
			return;
		}
		try {
			const j = await kirim(true);
			pesan = j.status ? 'Diajukan ke kurasi.' : 'Cek otomatis menemukan masalah; perbaiki lalu ajukan lagi.';
		} catch {
			pesan = 'Gagal mengajukan. Draf tetap tersimpan di perangkat ini.';
		}
	}

	function ubahTag(t: Tag, aktif: boolean) {
		form.tag = aktif ? [...form.tag, t] : form.tag.filter((x) => x !== t);
	}
	function tambahVarian() {
		form.varian.push({ nama_varian: '', sku: '', harga_idr: 0, stok: 0, satuan: 'g', berat_kirim_gram: 0 });
	}
</script>

<main>
	<h1 id="draf-judul-halaman" data-testid="draf-judul-halaman">Draf Produk</h1>
	<p aria-live="polite" id="status-simpan" data-testid="status-simpan">Status: {autosave?.status ?? status}</p>

	<form onsubmit={(e) => { e.preventDefault(); void ajukan(); }}>
		<label>Judul (10–80 karakter, memuat berat/isi)
			<input id="input-judul" data-testid="input-judul" bind:value={form.judul} aria-invalid={!!peta.judul} />
		</label>
		{#if peta.judul}<p class="galat" role="alert">{peta.judul}</p>{/if}

		<label>Kategori
			<select id="pilih-kategori" data-testid="pilih-kategori" bind:value={form.kategori_kode} aria-invalid={!!peta.kategori_kode}>
				<option value="">— pilih —</option>
				{#each KATEGORI as k}<option value={k}>{k}</option>{/each}
			</select>
		</label>
		{#if peta.kategori_kode}<p class="galat" role="alert" id="galat-kategori" data-testid="galat-kategori">{peta.kategori_kode}</p>{/if}

		<fieldset>
			<legend>Tag (maks {MAKS_TAG})</legend>
			{#each TAG_BAKU as t}
				<label>
					<input
						type="checkbox"
						checked={form.tag.includes(t)}
						onchange={(e) => ubahTag(t, e.currentTarget.checked)}
					/>
					{t}
				</label>
			{/each}
		</fieldset>
		{#if peta.tag}<p class="galat" role="alert">{peta.tag}</p>{/if}

		<label>Deskripsi <textarea id="input-deskripsi" data-testid="input-deskripsi" bind:value={form.deskripsi}></textarea></label>
		<label>Komposisi <textarea id="input-komposisi" data-testid="input-komposisi" bind:value={form.komposisi}></textarea></label>
		{#if peta.komposisi}<p class="galat" role="alert">{peta.komposisi}</p>{/if}
		<label>Alergen (pisahkan koma)
			<input
				id="input-alergen" data-testid="input-alergen"
				value={form.alergen.join(', ')}
				oninput={(e) => (form.alergen = e.currentTarget.value.split(',').map((s) => s.trim()).filter(Boolean))}
			/>
		</label>
		{#if peta.alergen}<p class="galat" role="alert">{peta.alergen}</p>{/if}

		{#each form.varian as v, i}
			<fieldset>
				<legend>Varian {i + 1}</legend>
				<label>Nama <input id="varian-{i}-nama" data-testid="varian-{i}-nama" bind:value={v.nama_varian} /></label>
				<label>SKU <input id="varian-{i}-sku" data-testid="varian-{i}-sku" bind:value={v.sku} /></label>
				{#if peta[`varian[${i}].sku`]}<p class="galat" role="alert">{peta[`varian[${i}].sku`]}</p>{/if}
				<label>Harga (IDR, kelipatan 500) <input id="varian-{i}-harga" data-testid="varian-{i}-harga" type="number" step="500" bind:value={v.harga_idr} /></label>
				{#if peta[`varian[${i}].harga_idr`]}<p class="galat" role="alert">{peta[`varian[${i}].harga_idr`]}</p>{/if}
				<label>Stok <input id="varian-{i}-stok" data-testid="varian-{i}-stok" type="number" min="0" bind:value={v.stok} /></label>
				<label>Satuan
					<select bind:value={v.satuan}>{#each SATUAN as s}<option value={s}>{s}</option>{/each}</select>
				</label>
				<label>Berat kirim (g) <input id="varian-{i}-berat" data-testid="varian-{i}-berat" type="number" min="1" bind:value={v.berat_kirim_gram} /></label>
			</fieldset>
		{/each}
		<button type="button" id="tambah-varian" data-testid="tambah-varian" onclick={tambahVarian}>Tambah varian</button>
		<button type="submit" id="ajukan-kurasi" data-testid="ajukan-kurasi">Ajukan Kurasi</button>
	</form>
	{#if pesan}<p role="status" id="pesan-hasil" data-testid="pesan-hasil">{pesan}</p>{/if}
</main>

<style>
	.galat {
		color: #b00020;
		margin: 0;
	}
</style>
