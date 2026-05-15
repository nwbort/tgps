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

	/** Insert null between consecutive points that are more than 1 day apart. */
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

	/** Return data for a dotted connector series spanning only gap segments. */
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

		const avgWithNulls = withGapNulls(avg);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const posData = avgWithNulls.map((pt) => (pt === null ? null : [pt[0], Math.max(0, pt[1])])) as any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const negData = avgWithNulls.map((pt) => (pt === null ? null : [pt[0], Math.min(0, pt[1])])) as any;

		const avgGaps = gapSegments(avg);

		// Terminal series — main lines + dotted gap connectors
		const termAllSeries: EChartsOption['series'] = [];
		for (const [key, points] of terminals) {
			const location = key.split('|')[1] ?? key;
			termAllSeries.push({
				name: location,
				type: 'line' as const,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				data: withGapNulls(points) as any,
				symbol: 'none',
				lineStyle: { color: '#334155', width: 1.5 },
				itemStyle: { color: '#334155' },
				silent: true,
				z: 1,
			});
			const gaps = gapSegments(points);
			if (gaps.length > 0) {
				termAllSeries.push({
					name: `_gap_${location}`,
					type: 'line' as const,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					data: gaps as any,
					symbol: 'none',
					lineStyle: { color: '#334155', width: 1, type: 'dotted' as const },
					silent: true,
					z: 1,
				});
			}
		}

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
					const termItems = items.filter(
						(p) => !p.seriesName.startsWith('_') && p.value[1] != null,
					);
					const termVals = termItems.map((p) => p.value[1]);
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
				// Red fill above x-axis
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
				// Green fill below x-axis
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
				// Terminal lines + their gap connectors
				...termAllSeries,
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
				// Bold average line
				{
					name: '_avg',
					type: 'line' as const,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					data: avgWithNulls as any,
					symbol: 'none',
					lineStyle: { width: 2.5, color: '#60a5fa' },
					itemStyle: { color: '#60a5fa' },
					z: 10,
				},
				// Dotted connector for avg gaps
				...(avgGaps.length > 0
					? [
							{
								name: '_avg_gap',
								type: 'line' as const,
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								data: avgGaps as any,
								symbol: 'none',
								lineStyle: { color: '#60a5fa', width: 1.5, type: 'dotted' as const },
								silent: true,
								z: 10,
							},
						]
					: []),
			],
		};
	}
</script>

<Chart option={option} {height} />
