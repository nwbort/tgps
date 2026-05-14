export type FuelType = 'ulp91' | 'e10' | 'p95' | 'p98' | 'diesel' | 'b5' | 'prediesel';

export type StateCode = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'NT' | 'TAS';

export interface TgpRecord {
	date: string; // YYYY-MM-DD
	provider: string;
	state: StateCode;
	location: string;
	fuelType: FuelType;
	priceCpl: number; // cents per litre, inc GST
}

export interface ProviderSource {
	id: string;
	name: string;
	colour: string;
	rawUrl: string;
	parse: (csv: string) => TgpRecord[];
}

export const FUEL_LABELS: Record<FuelType, string> = {
	ulp91: 'ULP 91',
	e10: 'E10',
	p95: 'Premium 95',
	p98: 'Premium 98',
	diesel: 'Diesel',
	b5: 'Biodiesel B5',
	prediesel: 'Premium Diesel',
};

export const PROVIDER_COLOURS: Record<string, string> = {
	bp: '#009B4D',
	ampol: '#E2003A',
	viva: '#E8231A',
	united: '#0047AB',
	atlas: '#FF6B00',
	mobil: '#E31837',
	freedomfuels: '#007DC3',
	caltex: '#E31837',
};
