<script lang="ts">
	import type { EChartsOption } from 'echarts';
	import Chart from './Chart.svelte';

	interface Props {
		terminalSeries: Map<string, Array<[string, number]>>;
		avgSeries: Array<[string, number]>;
		height?: string;
	}

	let { terminalSeries, avgSeries, height = '420px' }: Props = $props();

	let option = $derived(buildOption(terminalSeries, avgSeries));

	function buildOption(
		terminals: Map<string, Array<[string, number]>>,
		avg: Array<[string, number]>,
	): EChartsOption {
		if (avg.length === 0) {
			return {
				backgroundColor: 'transparent',
				title: {
					text: 'No E10 and ULP 91 data for this selection',
					textStyle: { color: '#94A3B8', fontSize: 13 },
					left: 'center',
					top: 'middle',
				},
			};
		}

		const termSeries = Array.from(terminals.entries()).map(([key, points]) => {
			const location = key.split('|')[1] ?? key;
			return {
				name: location,
				type: 'line' as const,
				data: points,
				symbol: 'none',
				lineStyle: { color: '#334155', width: 1.5 },
				itemStyle: { color: '#334155' },
				silent: true,
				z: 1,
			};
		});

		// Clamp avg data for the two area fills
		const posData = avg.map(([d, v]) => [d, Math.max(0, v)]);
		const negData = avg.map(([d, v]) => [d, Math.min(0, v)]);

		return {
			backgroundColor: 'transparent',
			tooltip: {
				trigger: 'axis',
				formatter: (params: unknown) => {
					const items = params as Array<{ seriesName: string; value: [string, number] }>;
					const avgItem = items.find((p) => p.seriesName === '_avg');
					if (!avgItem) return '';
					const date = avgItem.value[0];
					const v = avgItem.value[1];
					const sign = v > 0 ? '+' : '';
					const col = v >= 0 ? '#f87171' : '#4ade80';
					const termItems = items.filter((p) => p.seriesName !== '_avg' && p.seriesName !== '_zero');
					const termVals = termItems.map((p) => p.value[1]).filter((x) => x != null);
					let html = `<div style="font-size:12px"><b>${date}</b><br>Avg: <b style="color:${col}">${sign}${v.toFixed(1)}¢/L</b>`;
					if (termVals.length > 0) {
						const sorted = [...termVals].sort((a, b) => a - b);
						const minV = sorted[0].toFixed(1);
						const maxV = sorted[sorted.length - 1].toFixed(1);
						html += `<br><span style="color:#64748b;font-size:11px">${termVals.length} terminal${termVals.length !== 1 ? 's' : ''}: ${minV}¢ to ${maxV}¢</span>`;
					}
					html += '</div>';
					return html;
				},
			},
			grid: { left: 70, right: 20, top: 20, bottom: 80 },
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
				// Red fill above x-axis (positive values only)
				{
					name: '_pos_fill',
					type: 'line' as const,
					data: posData,
					symbol: 'none',
					lineStyle: { width: 0, color: 'transparent' },
					areaStyle: { color: 'rgba(239, 68, 68, 0.2)' },
					silent: true,
					z: 2,
				},
				// Green fill below x-axis (negative values only)
				{
					name: '_neg_fill',
					type: 'line' as const,
					data: negData,
					symbol: 'none',
					lineStyle: { width: 0, color: 'transparent' },
					areaStyle: { color: 'rgba(34, 197, 94, 0.2)' },
					silent: true,
					z: 2,
				},
				// Terminal lines (grey, subtle)
				...termSeries,
				// Zero reference line
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
					z: 3,
				},
				// Bold average line on top
				{
					name: '_avg',
					type: 'line' as const,
					data: avg,
					symbol: 'none',
					lineStyle: { width: 2.5, color: '#60a5fa' },
					itemStyle: { color: '#60a5fa' },
					z: 10,
				},
			],
		};
	}
</script>

<Chart option={option} {height} />
