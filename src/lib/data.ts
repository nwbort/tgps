import type { FuelType, StateCode, TgpRecord } from './types';
import { PROVIDERS } from './sources';

export interface LoadResult {
	records: TgpRecord[];
	errors: Array<{ provider: string; message: string }>;
}

export async function loadAllProviders(): Promise<LoadResult> {
	const results = await Promise.allSettled(
		PROVIDERS.map(async (provider) => {
			const res = await fetch(provider.rawUrl);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const csv = await res.text();
			return provider.parse(csv);
		}),
	);

	const records: TgpRecord[] = [];
	const errors: LoadResult['errors'] = [];

	results.forEach((result, i) => {
		if (result.status === 'fulfilled') {
			records.push(...result.value);
		} else {
			errors.push({ provider: PROVIDERS[i].id, message: result.reason?.message ?? 'Unknown error' });
		}
	});

	// Sort by date ascending
	records.sort((a, b) => a.date.localeCompare(b.date));
	return { records, errors };
}

export function filterRecords(
	records: TgpRecord[],
	opts: {
		providers?: string[];
		fuelTypes?: FuelType[];
		states?: StateCode[];
		dateFrom?: string;
		dateTo?: string;
	},
): TgpRecord[] {
	return records.filter((r) => {
		if (opts.providers?.length && !opts.providers.includes(r.provider)) return false;
		if (opts.fuelTypes?.length && !opts.fuelTypes.includes(r.fuelType)) return false;
		if (opts.states?.length && !opts.states.includes(r.state)) return false;
		if (opts.dateFrom && r.date < opts.dateFrom) return false;
		if (opts.dateTo && r.date > opts.dateTo) return false;
		return true;
	});
}

/** Return the most recent price per (provider, location, fuelType) */
export function latestPrices(records: TgpRecord[]): TgpRecord[] {
	const latest = new Map<string, TgpRecord>();
	for (const r of records) {
		const key = `${r.provider}|${r.location}|${r.fuelType}`;
		const existing = latest.get(key);
		if (!existing || r.date > existing.date) latest.set(key, r);
	}
	return Array.from(latest.values()).sort((a, b) => a.provider.localeCompare(b.provider));
}

/** Group records into time series by (provider, fuelType) for charting */
export function toTimeSeries(
	records: TgpRecord[],
	groupBy: 'provider' | 'fuelType',
): Map<string, Array<[string, number]>> {
	// Average across locations for a given group on each date
	const grouped = new Map<string, Map<string, number[]>>();

	for (const r of records) {
		const key = groupBy === 'provider' ? r.provider : r.fuelType;
		if (!grouped.has(key)) grouped.set(key, new Map());
		const dateMap = grouped.get(key)!;
		if (!dateMap.has(r.date)) dateMap.set(r.date, []);
		dateMap.get(r.date)!.push(r.priceCpl);
	}

	const series = new Map<string, Array<[string, number]>>();
	for (const [key, dateMap] of grouped) {
		const points: Array<[string, number]> = [];
		for (const [date, prices] of dateMap) {
			const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
			points.push([date, Math.round(avg * 10) / 10]);
		}
		points.sort((a, b) => a[0].localeCompare(b[0]));
		series.set(key, points);
	}

	return series;
}

/** Compute spread between two series (series1 - series2) aligned by date */
export function computeSpread(
	series1: Array<[string, number]>,
	series2: Array<[string, number]>,
): Array<[string, number]> {
	const map2 = new Map(series2);
	return series1.flatMap(([date, price]) => {
		const other = map2.get(date);
		if (other === undefined) return [];
		return [[date, Math.round((price - other) * 10) / 10] as [string, number]];
	});
}
