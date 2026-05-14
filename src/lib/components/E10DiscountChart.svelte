<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import type { TgpRecord } from '$lib/types';
	import { PROVIDER_MAP } from '$lib/sources';
	import { computeE10Discount } from '$lib/data';
	import Chart from './Chart.svelte';

	interface Props {
		records: TgpRecord[];
		height?: string;
	}

	let { records, height = '420px' }: Props = $props();

	let option = $derived((): EChartsOption => {
		const series = computeE10Discount(records);

		if (series.size === 0) {
			return {
				backgroundColor: 'transparent',
				title: { text: 'No terminals have both E10 and ULP 91 data', textStyle: { color: '#94A3B8', fontSize: 13 }, left: 'center', top: 'middle' },
			};
		}

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
						.sort((a, b) => a.value[1] - b.value[1])
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
				name: 'E10 vs ULP 91 (¢/L)',
				nameTextStyle: { color: '#94A3B8', fontSize: 11 },
				axisLabel: { color: '#94A3B8', fontSize: 11, formatter: '{value}¢' },
				splitLine: { lineStyle: { color: '#1E293B' } },
			},
			dataZoom: [
				{ type: 'inside', xAxisIndex: 0 },
				{ type: 'slider', xAxisIndex: 0, bottom: 10, height: 20, textStyle: { color: '#94A3B8' }, borderColor: '#334155', fillerColor: 'rgba(148,163,184,0.1)' },
			],
			series: [
			// Zero reference line via a markLine on an invisible base series
			{
				name: '_zero',
				type: 'line' as const,
				data: [],
				markLine: {
					silent: true,
					symbol: 'none',
					data: [{ yAxis: 0 }],
					lineStyle: { color: '#475569', type: 'dashed' as const },
					label: { show: false },
				},
			},
			...Array.from(series.entries()).map(([key, points]) => {
				const [providerId, location] = key.split('|');
				const colour = PROVIDER_MAP[providerId]?.colour ?? '#94A3B8';
				const providerName = PROVIDER_MAP[providerId]?.name ?? providerId;
				return {
					name: `${providerName} – ${location}`,
					type: 'line' as const,
					smooth: false,
					symbol: 'none',
					lineStyle: { width: 2 },
					color: colour,
					data: points,
				};
			})],
		};
	});
</script>

<Chart option={option()} {height} />
