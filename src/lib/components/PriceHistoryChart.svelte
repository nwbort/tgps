<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type { TgpRecord } from '$lib/types';
	import { PROVIDER_MAP } from '$lib/sources';
	import { toTimeSeries } from '$lib/data';
	import Chart from './Chart.svelte';

	interface Props {
		records: TgpRecord[];
		groupBy?: 'provider' | 'fuelType';
		height?: string;
	}

	let { records, groupBy = 'provider', height = '420px' }: Props = $props();

	const FUEL_LABELS: Record<string, string> = {
		ulp91: 'ULP 91', e10: 'E10', p95: 'Premium 95',
		p98: 'Premium 98', diesel: 'Diesel', b5: 'Biodiesel B5', prediesel: 'Premium Diesel',
	};

	const FUEL_COLOURS: Record<string, string> = {
		ulp91: '#60A5FA', e10: '#34D399', p95: '#FBBF24',
		p98: '#F87171', diesel: '#A78BFA', b5: '#6EE7B7', prediesel: '#C084FC',
	};

	let option = $derived((): EChartsOption => {
		const series = toTimeSeries(records, groupBy);
		return {
			backgroundColor: 'transparent',
			tooltip: {
				trigger: 'axis',
				formatter: (params: unknown) => {
					const items = params as Array<{ seriesName: string; value: [string, number]; color: string }>;
					if (!items.length) return '';
					const date = items[0].value[0];
					const lines = items
						.filter((p) => p.value[1] != null)
						.sort((a, b) => b.value[1] - a.value[1])
						.map((p) => `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:5px;"></span>${p.seriesName}: <b>${p.value[1].toFixed(1)}¢</b>`)
						.join('<br>');
					return `<div style="font-size:12px"><b>${date}</b><br>${lines}</div>`;
				},
			},
			legend: {
				top: 0,
				textStyle: { color: '#CBD5E1' },
			},
			grid: { left: 60, right: 20, top: 40, bottom: 80 },
			xAxis: {
				type: 'time',
				axisLabel: { color: '#94A3B8', fontSize: 11 },
				axisLine: { lineStyle: { color: '#334155' } },
				splitLine: { lineStyle: { color: '#1E293B' } },
			},
			yAxis: {
				type: 'value',
				name: '¢/L (inc. GST)',
				nameTextStyle: { color: '#94A3B8', fontSize: 11 },
				axisLabel: { color: '#94A3B8', fontSize: 11, formatter: '{value}¢' },
				splitLine: { lineStyle: { color: '#1E293B' } },
			},
			dataZoom: [
				{ type: 'inside', xAxisIndex: 0 },
				{ type: 'slider', xAxisIndex: 0, bottom: 10, height: 20, textStyle: { color: '#94A3B8' }, borderColor: '#334155', fillerColor: 'rgba(148,163,184,0.1)' },
			],
			series: Array.from(series.entries()).map(([key, points]) => ({
				name: groupBy === 'provider' ? (PROVIDER_MAP[key]?.name ?? key) : (FUEL_LABELS[key] ?? key),
				type: 'line',
				smooth: false,
				symbol: 'none',
				lineStyle: { width: 2 },
				color: groupBy === 'provider' ? (PROVIDER_MAP[key]?.colour ?? '#94A3B8') : (FUEL_COLOURS[key] ?? '#94A3B8'),
				data: points,
			})),
		};
	});
</script>

<Chart option={option()} {height} />
