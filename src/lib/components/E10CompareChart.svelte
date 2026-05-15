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

	/** Insert null between consecutive points that are more than 1 day apart, so ECharts breaks the line. */
	function withGapNulls(data: Array<[string, number]>): Array<[string, number] | null> {
		const result: Array<[string, number] | null> = [];
		for (let i = 0; i < data.length; i++) {
			result.push(data[i]);
			if (i < data.length - 1) {
				const dayDiff =
					(new Date(data[i + 1][0]).getTime() - new Date(data[i][0]).getTime()) / 86400000;
				if (dayDiff > 1.5) result.push(null);
			}
		}
		return result;
	}

	/** Return data for a dotted connector series that spans only the gap segments. */
	function gapSegments(data: Array<[string, number]>): Array<[string, number] | null> {
		const result: Array<[string, number] | null> = [];
		for (let i = 0; i < data.length - 1; i++) {
			const dayDiff =
				(new Date(data[i + 1][0]).getTime() - new Date(data[i][0]).getTime()) / 86400000;
			if (dayDiff > 1.5) {
				if (result.length > 0) result.push(null);
				result.push(data[i], data[i + 1]);
			}
		}
		return result;
	}

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

		const providerNames: string[] = [];
		const allSeries: EChartsOption['series'] = [];

		for (const [provider, points] of seriesMap) {
			const colour = PROVIDER_MAP[provider]?.colour ?? '#94A3B8';
			const name = PROVIDER_MAP[provider]?.name ?? provider;
			providerNames.push(name);

			// Main series — breaks at gaps via null values
			allSeries.push({
				name,
				type: 'line' as const,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				data: withGapNulls(points) as any,
				symbol: 'none',
				lineStyle: { width: 2 },
				color: colour,
			});

			// Dotted connector across each gap
			const gaps = gapSegments(points);
			if (gaps.length > 0) {
				allSeries.push({
					name: `_gap_${provider}`,
					type: 'line' as const,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					data: gaps as any,
					symbol: 'none',
					lineStyle: { color: colour, width: 1.5, type: 'dotted' as const },
					silent: true,
				});
			}
		}

		return {
			backgroundColor: 'transparent',
			legend: {
				top: 0,
				textStyle: { color: '#CBD5E1' },
				data: providerNames,
			},
			tooltip: {
				trigger: 'axis',
				formatter: (params: unknown) => {
					const items = params as Array<{ seriesName: string; value: [string, number]; color: string }>;
					if (!items.length) return '';
					const date = items[0].value[0];
					const lines = items
						.filter((p) => !p.seriesName.startsWith('_') && p.value[1] != null)
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
				...allSeries,
			],
		};
	}
</script>

<Chart option={option} {height} />
