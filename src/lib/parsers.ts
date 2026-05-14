import type { FuelType, StateCode, TgpRecord } from './types';

// --- Standard JSON format (normalised providers) ---

interface TgpJson {
	provider: string;
	updated: string;
	fields: string[];
	records: Array<unknown[]>;
}

export function parseStandardJson(text: string): TgpRecord[] {
	const data: TgpJson = JSON.parse(text);
	const { fields, records, provider } = data;
	const di = fields.indexOf('date');
	const si = fields.indexOf('state');
	const li = fields.indexOf('location');
	const fi = fields.indexOf('fuel_type');
	const pi = fields.indexOf('price_cpl');

	return records.flatMap((row) => {
		const state = row[si] as StateCode;
		if (!state) return [];
		return [{
			date: row[di] as string,
			provider,
			state,
			location: (row[li] as string) ?? '',
			fuelType: row[fi] as FuelType,
			priceCpl: row[pi] as number,
		}];
	});
}

