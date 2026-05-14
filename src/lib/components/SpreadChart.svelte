<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type { TgpRecord } from '$lib/types';
	import { PROVIDER_MAP, PROVIDERS } from '$lib/sources';
	import { computeSpread, toTimeSeries } from '$lib/data';
	import Chart from './Chart.svelte';

	interface Props {
		records: TgpRecord[];
		height?: string;
	}

	let { records, height = '360px' }: Props = $props();

	let option = $derived((): EChartsOption => {
		const providerSeries = toTimeSeries(records, 'provider');
		const providerIds = Array.from(providerSeries.keys());

		if (providerIds.length < 2) {
			return { title: { text: 'Select at least 2 providers to see spread', textStyle: { color: '#94A3B8' }, left: 'center', top: 'middle' }, backgroundColor: 'transparent' };
		}

		// Spread of each provider vs the first provider
		const baseId = providerIds[0];
		const baseSeries = providerSeries.get(baseId)!;
		const baseName = PROVIDER_MAP[baseId]?.name ?? baseId;

		const spreadSeries = providerIds.slice(1).map((id) => {
			const s = providerSeries.get(id)!;
			const spread = computeSpread(s, baseSeries);
			return {
				name: `${PROVIDER_MAP[id]?.name ?? id} vs ${baseName}`,
				type: 'line' as const,
				smooth: false,
				symbol: 'none',
				lineStyle: { width: 2 },
				color: PROVIDER_MAP[id]?.colour ?? '#94A3B8',
				data: spread,
				markLine: {
					silent: true,
					data: [{ yAxis: 0 }],
					lineStyle: { color: '#475569', type: 'dashed' as const },
					label: { show: false },
				},
			};
		});

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
						.map((p) => {
							const v = p.value[1];
							const sign = v >= 0 ? '+' : '';
							return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:5px;"></span>${p.seriesName}: <b>${sign}${v.toFixed(1)}¢</b>`;
						})
						.join('<br>');
					return `<div style="font-size:12px"><b>${date}</b><br>${lines}</div>`;
				},
			},
			legend: { top: 0, textStyle: { color: '#CBD5E1' } },
			grid: { left: 70, right: 20, top: 40, bottom: 80 },
			xAxis: {
				type: 'time',
				axisLabel: { color: '#94A3B8', fontSize: 11 },
				axisLine: { lineStyle: { color: '#334155' } },
				splitLine: { lineStyle: { color: '#1E293B' } },
			},
			yAxis: {
				type: 'value',
				name: 'Spread (¢/L)',
				nameTextStyle: { color: '#94A3B8', fontSize: 11 },
				axisLabel: { color: '#94A3B8', fontSize: 11, formatter: '{value}¢' },
				splitLine: { lineStyle: { color: '#1E293B' } },
			},
			dataZoom: [
				{ type: 'inside', xAxisIndex: 0 },
				{ type: 'slider', xAxisIndex: 0, bottom: 10, height: 20, textStyle: { color: '#94A3B8' }, borderColor: '#334155', fillerColor: 'rgba(148,163,184,0.1)' },
			],
			series: spreadSeries,
		};
	});
</script>

<Chart option={option()} {height} />
