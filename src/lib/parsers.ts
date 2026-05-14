import Papa from 'papaparse';
import type { FuelType, StateCode, TgpRecord } from './types';

function parseDate(raw: string): string {
	// Handle DD/MM/YYYY
	const dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
	// Already YYYY-MM-DD
	return raw.trim();
}

function normaliseFuelType(raw: string): FuelType | null {
	const s = raw.toLowerCase().replace(/[\s_-]+/g, '');
	if (s.includes('biodiesel') || s === 'b5') return 'b5';
	if (s.includes('prediesel') || s.includes('premiumdiesel')) return 'prediesel';
	if (s.includes('diesel') || s === 'dis' || s === 'ulsdiesel') return 'diesel';
	if (s.includes('98') || s === 'p98' || s === 'pulp98') return 'p98';
	if (s.includes('95') || s === 'p95' || s === 'pulp95' || s === 'pulp') return 'p95';
	if (s.includes('e10')) return 'e10';
	if (s.includes('ulp') || s.includes('unleaded') || s.includes('91')) return 'ulp91';
	return null;
}

function normaliseState(raw: string): StateCode | null {
	const s = raw.trim().toUpperCase();
	const map: Record<string, StateCode> = {
		'NEW SOUTH WALES': 'NSW', NSW: 'NSW',
		'VICTORIA': 'VIC', VIC: 'VIC',
		'QUEENSLAND': 'QLD', QLD: 'QLD',
		'SOUTH AUSTRALIA': 'SA', SA: 'SA',
		'WESTERN AUSTRALIA': 'WA', WA: 'WA',
		'NORTHERN TERRITORY': 'NT', NT: 'NT',
		'TASMANIA': 'TAS', TAS: 'TAS',
	};
	return map[s] ?? null;
}

type RawRow = Record<string, string>;

function parseCsv(csv: string): RawRow[] {
	const result = Papa.parse<RawRow>(csv.trim(), { header: true, skipEmptyLines: true });
	return result.data;
}

// --- BP ---
// columns: state, effective_date, terminal, fuel_type, price_cents_per_litre
export function parseBp(csv: string): TgpRecord[] {
	return parseCsv(csv).flatMap((row) => {
		const fuel = normaliseFuelType(row['fuel_type'] ?? '');
		const state = normaliseState(row['state'] ?? '');
		const price = parseFloat(row['price_cents_per_litre']);
		if (!fuel || !state || isNaN(price)) return [];
		return [{
			date: parseDate(row['effective_date']),
			provider: 'bp',
			state,
			location: row['terminal']?.trim() ?? '',
			fuelType: fuel,
			priceCpl: price,
		}];
	});
}

// --- Ampol ---
// columns: state, terminal, effective_date, fuel, tgp
export function parseAmpol(csv: string): TgpRecord[] {
	return parseCsv(csv).flatMap((row) => {
		const fuel = normaliseFuelType(row['fuel'] ?? '');
		const state = normaliseState(row['state'] ?? '');
		const price = parseFloat(row['tgp']);
		if (!fuel || !state || isNaN(price)) return [];
		return [{
			date: parseDate(row['effective_date']),
			provider: 'ampol',
			state,
			location: row['terminal']?.trim() ?? '',
			fuelType: fuel,
			priceCpl: price,
		}];
	});
}

// --- Viva ---
// Wide format: State, City, UnleadedPetrol, PremiumUnleadedPetrol, UnleadedPetrol E10, UnleadedPetrol 98, Diesel, BiodieselB5, Date
const VIVA_FUEL_COLS: Array<[string, FuelType]> = [
	['UnleadedPetrol', 'ulp91'],
	['PremiumUnleadedPetrol', 'p95'],
	['UnleadedPetrol E10', 'e10'],
	['UnleadedPetrol 98', 'p98'],
	['Diesel', 'diesel'],
	['BiodieselB5', 'b5'],
];

export function parseViva(csv: string): TgpRecord[] {
	return parseCsv(csv).flatMap((row) => {
		const state = normaliseState(row['State'] ?? '');
		if (!state) return [];
		const date = parseDate(row['Date']);
		const location = row['City']?.trim() ?? '';
		return VIVA_FUEL_COLS.flatMap(([col, fuelType]) => {
			const raw = row[col];
			if (!raw || raw === 'N/A') return [];
			const price = parseFloat(raw);
			if (isNaN(price)) return [];
			return [{ date, provider: 'viva', state, location, fuelType, priceCpl: price }];
		});
	});
}

// --- United ---
// columns: Date, Terminal, Product, TGP_Excluding_GST, GST, TGP_Including_GST
export function parseUnited(csv: string): TgpRecord[] {
	return parseCsv(csv).flatMap((row) => {
		const fuel = normaliseFuelType(row['Product'] ?? '');
		const price = parseFloat(row['TGP_Including_GST']);
		if (!fuel || isNaN(price)) return [];
		const terminal = row['Terminal']?.trim() ?? '';
		// United terminals are in VIC (Hastings, Yarraville)
		const state: StateCode = 'VIC';
		return [{
			date: parseDate(row['Date']),
			provider: 'united',
			state,
			location: terminal,
			fuelType: fuel,
			priceCpl: price,
		}];
	});
}

// --- Atlas ---
// columns: date, state, location, fuel_type, price_cpl (assumed standard)
export function parseAtlas(csv: string): TgpRecord[] {
	return parseCsv(csv).flatMap((row) => {
		const fuel = normaliseFuelType(row['fuel_type'] ?? '');
		const state = normaliseState(row['state'] ?? '');
		const price = parseFloat(row['price_cpl'] ?? row['price_cents_per_litre']);
		if (!fuel || !state || isNaN(price)) return [];
		return [{
			date: parseDate(row['date']),
			provider: 'atlas',
			state,
			location: row['location']?.trim() ?? '',
			fuelType: fuel,
			priceCpl: price,
		}];
	});
}

// --- Mobil ---
// columns: date, state, location, fuel_type, price_cpl (assumed standard)
export function parseMobil(csv: string): TgpRecord[] {
	return parseCsv(csv).flatMap((row) => {
		const fuel = normaliseFuelType(row['fuel_type'] ?? '');
		const state = normaliseState(row['state'] ?? '');
		const price = parseFloat(row['price_cpl'] ?? row['price_cents_per_litre']);
		if (!fuel || !state || isNaN(price)) return [];
		return [{
			date: parseDate(row['date']),
			provider: 'mobil',
			state,
			location: row['location']?.trim() ?? '',
			fuelType: fuel,
			priceCpl: price,
		}];
	});
}

// --- Freedom Fuels ---
// columns: date, state, location, fuel_type, price_cpl (assumed standard)
export function parseFreedomFuels(csv: string): TgpRecord[] {
	return parseCsv(csv).flatMap((row) => {
		const fuel = normaliseFuelType(row['fuel_type'] ?? '');
		const state = normaliseState(row['state'] ?? '');
		const price = parseFloat(row['price_cpl'] ?? row['price_cents_per_litre']);
		if (!fuel || !state || isNaN(price)) return [];
		return [{
			date: parseDate(row['date']),
			provider: 'freedomfuels',
			state,
			location: row['location']?.trim() ?? '',
			fuelType: fuel,
			priceCpl: price,
		}];
	});
}

// --- Caltex ---
// columns: date, state, location, fuel_type, price_cents_per_litre
export function parseCaltex(csv: string): TgpRecord[] {
	return parseCsv(csv).flatMap((row) => {
		const fuel = normaliseFuelType(row['fuel_type'] ?? '');
		const state = normaliseState(row['state'] ?? '');
		const price = parseFloat(row['price_cents_per_litre']);
		if (!fuel || !state || isNaN(price)) return [];
		return [{
			date: parseDate(row['date']),
			provider: 'caltex',
			state,
			location: row['location']?.trim() ?? '',
			fuelType: fuel,
			priceCpl: price,
		}];
	});
}
