import type { ProviderSource } from './types';
import { parseStandardJson } from './parsers';

function rawUrl(repo: string, file: string): string {
	return `https://raw.githubusercontent.com/nwbort/${repo}/main/${file}`;
}

export const PROVIDERS: ProviderSource[] = [
	{
		id: 'bp',
		name: 'BP',
		colour: '#009B4D',
		rawUrl: rawUrl('tgp-bp', 'tgp_data.json'),
		parse: parseStandardJson,
	},
	{
		id: 'ampol',
		name: 'Ampol',
		colour: '#E2003A',
		rawUrl: rawUrl('tgp-ampol', 'tgp_data.json'),
		parse: parseStandardJson,
	},
	{
		id: 'viva',
		name: 'Viva Energy',
		colour: '#FF6B00',
		rawUrl: rawUrl('tgp-viva', 'tgp_data.json'),
		parse: parseStandardJson,
	},
	{
		id: 'united',
		name: 'United',
		colour: '#0047AB',
		rawUrl: rawUrl('tgp-united', 'tgp_data.json'),
		parse: parseStandardJson,
	},
	{
		id: 'atlas',
		name: 'Atlas',
		colour: '#8B5CF6',
		rawUrl: rawUrl('tgp-atlas', 'tgp_data.json'),
		parse: parseStandardJson,
	},
	{
		id: 'mobil',
		name: 'Mobil',
		colour: '#E31837',
		rawUrl: rawUrl('tgp-mobil', 'tgp_data.json'),
		parse: parseStandardJson,
	},
	{
		id: 'freedomfuels',
		name: 'Freedom Fuels',
		colour: '#007DC3',
		rawUrl: rawUrl('tgp-freedomfuels', 'tgp_data.json'),
		parse: parseStandardJson,
	},
	{
		id: 'caltex',
		name: 'Caltex',
		colour: '#F59E0B',
		rawUrl: rawUrl('tgp-caltex', 'tgp_data.json'),
		parse: parseStandardJson,
	},
];

export const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));
