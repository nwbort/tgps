<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { EChartsOption, ECharts } from 'echarts';

	interface Props {
		option: EChartsOption;
		height?: string;
		class?: string;
	}

	let { option, height = '400px', class: className = '' }: Props = $props();

	let container: HTMLDivElement;
	let chart: ECharts | null = null;

	onMount(async () => {
		const echarts = await import('echarts');
		chart = echarts.init(container, 'dark', { renderer: 'canvas' });
		chart.setOption(option);

		const observer = new ResizeObserver(() => chart?.resize());
		observer.observe(container);
		return () => observer.disconnect();
	});

	$effect(() => {
		chart?.setOption(option, { notMerge: false, replaceMerge: ['series'] });
	});

	onDestroy(() => chart?.dispose());
</script>

<div bind:this={container} style="height: {height}; width: 100%;" class={className}></div>
