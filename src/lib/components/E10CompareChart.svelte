<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import { PROVIDER_MAP } from '$lib/sources';
	import Chart from './Chart.svelte';

	interface Props {
		series: Map<string, Array<[string, number]>>;
		height?: string;
	}

	let { series, height = '420px' }: Props = $props();

	let option = $derived(buildOption(series));

	function buildOption(seriesMap: Map<string, Array<[string, number]>>): EChartsOption {
		if (seriesMap.size === 0) {
			return {
				backgroundColor: 'transparent',
				title: {
					text: 'No E10 and ULP 91 data for this state',
					textStyle: { color: '#94A3B8', fontSize: 13 },
					left: 'center',
					top: 'middle',
				},
			};
		}

		const chartSeries = Array.from(seriesMap.entries()).map(([provider, points]) => ({
			name: PROVIDER_MAP[provider]?.name ?? provider,
			type: 'line' as const,
			data: points,
			symbol: 'none',
			lineStyle: { width: 2 },
			color: PROVIDER_MAP[provider]?.colour ?? '#94A3B8',
		}));

		return {
			backgroundColor: 'transparent',
			legend: {
				top: 0,
				textStyle: { color: '#CBD5E1' },
				data: chartSeries.map((s) => s.name),
			},
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
							const sign = v > 0 ? '+' : '';
							return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px;"></span>${p.seriesName}: <b>${sign}${v.toFixed(1)}¢</b>`;
						})
						.join('<br>');
					return `<div style="font-size:12px"><b>${date}</b><br>${lines}</div>`;
				},
			},
			grid: { left: 70, right: 20, top: 40, bottom: 80 },
			xAxis: {
				type: 'time',
				axisLabel: { color: '#94A3B8', fontSize: 11 },
				axisLine: { lineStyle: { color: '#334155' } },
				splitLine: { lineStyle: { color: '#1E293B' } },
			},
			yAxis: {
				type: 'value',
				name: '¢/L vs ULP 91',
				nameTextStyle: { color: '#94A3B8', fontSize: 11 },
				axisLabel: { color: '#94A3B8', fontSize: 11, formatter: '{value}¢' },
				splitLine: { lineStyle: { color: '#1E293B' } },
				min: (value: { min: number }) => Math.min(value.min, 0) - 1,
				max: (value: { max: number }) => Math.max(value.max, 0) + 1,
			},
			dataZoom: [
				{ type: 'inside', xAxisIndex: 0 },
				{
					type: 'slider',
					xAxisIndex: 0,
					bottom: 10,
					height: 20,
					textStyle: { color: '#94A3B8' },
					borderColor: '#334155',
					fillerColor: 'rgba(148,163,184,0.1)',
				},
			],
			series: [
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
				...chartSeries,
			],
		};
	}
</script>

<Chart option={option} {height} />
