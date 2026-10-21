/**
 * Pemanggil HTTP generik untuk klien per-fitur. Hanya dipakai di sisi server
 * SvelteKit (token tidak boleh terekspos ke browser). Galat memakai `GalatApi`
 * dari klien dasar agar penanganan 4xx seragam.
 */
import { GalatApi, type ErrorApi } from './pasaree';

export interface OpsiPemanggil {
	baseUrl: string;
	token: string;
	fetch?: typeof fetch;
}

export interface OpsiPanggil {
	body?: unknown;
	idempotencyKey?: string;
}

export type Pemanggil = <T>(method: string, path: string, opsi?: OpsiPanggil) => Promise<T>;

export function buatPemanggil({ baseUrl, token, fetch: f = fetch }: OpsiPemanggil): Pemanggil {
	const base = baseUrl.replace(/\/+$/, '');
	return async function panggil<T>(method: string, path: string, opsi: OpsiPanggil = {}) {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json'
		};
		if (opsi.body !== undefined) headers['Content-Type'] = 'application/json';
		if (opsi.idempotencyKey) headers['Idempotency-Key'] = opsi.idempotencyKey;
		const res = await f(`${base}${path}`, {
			method,
			headers,
			body: opsi.body === undefined ? undefined : JSON.stringify(opsi.body)
		});
		const teks = await res.text();
		let json: unknown = null;
		if (teks) {
			try {
				json = JSON.parse(teks);
			} catch {
				json = null;
			}
		}
		if (!res.ok) throw new GalatApi(res.status, json as ErrorApi | null);
		return json as T;
	};
}
