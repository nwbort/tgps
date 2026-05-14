import type { ProviderSource } from './types';
import {
	parseAmpol, parseAtlas, parseBp, parseCaltex,
	parseFreedomFuels, parseMobil, parseUnited, parseViva,
} from './parsers';

function rawUrl(repo: string, file: string): string {
	return `https://raw.githubusercontent.com/nwbort/${repo}/main/${file}`;
}

export const PROVIDERS: ProviderSource[] = [
	{
		id: 'bp',
		name: 'BP',
		colour: '#009B4D',
		rawUrl: rawUrl('tgp-bp', 'bp_pricing_history.csv'),
		parse: parseBp,
	},
	{
		id: 'ampol',
		name: 'Ampol',
		colour: '#E2003A',
		rawUrl: rawUrl('tgp-ampol', 'ampol_tgp_data.csv'),
		parse: parseAmpol,
	},
	{
		id: 'viva',
		name: 'Viva Energy',
		colour: '#FF6B00',
		rawUrl: rawUrl('tgp-viva', 'tgp-viva-history.csv'),
		parse: parseViva,
	},
	{
		id: 'united',
		name: 'United',
		colour: '#0047AB',
		rawUrl: rawUrl('tgp-united', 'tgp-united-history.csv'),
		parse: parseUnited,
	},
	{
		id: 'atlas',
		name: 'Atlas',
		colour: '#8B5CF6',
		rawUrl: rawUrl('tgp-atlas', 'tgp-atlas-history.csv'),
		parse: parseAtlas,
	},
	{
		id: 'mobil',
		name: 'Mobil',
		colour: '#E31837',
		rawUrl: rawUrl('tgp-mobil', 'tgp-mobil-history.csv'),
		parse: parseMobil,
	},
	{
		id: 'freedomfuels',
		name: 'Freedom Fuels',
		colour: '#007DC3',
		rawUrl: rawUrl('tgp-freedomfuels', 'tgp-freedomfuels-history.csv'),
		parse: parseFreedomFuels,
	},
	{
		id: 'caltex',
		name: 'Caltex',
		colour: '#F59E0B',
		rawUrl: rawUrl('tgp-caltex', 'tgp-caltex-history.csv'),
		parse: parseCaltex,
	},
];

export const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));
