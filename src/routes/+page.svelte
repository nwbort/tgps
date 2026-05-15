<script lang="ts">
	import { onMount } from 'svelte';
	import type { StateCode, TgpRecord } from '$lib/types';
	import { loadAllProviders, computeE10Discount } from '$lib/data';
	import { PROVIDERS, PROVIDER_MAP } from '$lib/sources';
	import E10FocusChart from '$lib/components/E10FocusChart.svelte';
	import E10CompareChart from '$lib/components/E10CompareChart.svelte';

	type Tab = 'single' | 'compare';

	let allRecords: TgpRecord[] = $state([]);
	let loadErrors: Array<{ provider: string; message: string }> = $state([]);
	let loading = $state(true);
	let activeTab: Tab = $state('single');

	const STATES: StateCode[] = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'NT', 'TAS'];
	const sortedProviders = [...PROVIDERS].sort((a, b) => a.name.localeCompare(b.name));

	let selectedState: StateCode = $state('NSW');
	let selectedProvider = $state('mobil');

	// Records for the focused single-provider view (E10 and ULP91 only)
	let focusRecords = $derived(
		allRecords.filter(
			(r) =>
				r.provider === selectedProvider &&
				r.state === selectedState &&
				(r.fuelType === 'e10' || r.fuelType === 'ulp91'),
		),
	);

	// Per-terminal discount series for the focused provider
	let terminalSeries = $derived(computeE10Discount(focusRecords));

	// Average discount across all terminals, per date
	let avgSeries: Array<[string, number]> = $derived.by(() => {
		const dateMap = new Map<string, number[]>();
		for (const [, points] of terminalSeries) {
			for (const [date, val] of points) {
				if (!dateMap.has(date)) dateMap.set(date, []);
				dateMap.get(date)!.push(val);
			}
		}
		const result: Array<[string, number]> = [];
		for (const [date, vals] of dateMap) {
			const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
			result.push([date, Math.round(mean * 10) / 10]);
		}
		return result.sort((a, b) => a[0].localeCompare(b[0]));
	});

	// Most recent date in the full dataset — used as the reference for "last N days"
	let maxDate = $derived(allRecords.length ? allRecords[allRecords.length - 1].date : '');

	function cutoffDate(referenceDate: string, days: number): string {
		const d = new Date(referenceDate);
		d.setDate(d.getDate() - days);
		return d.toISOString().slice(0, 10);
	}

	let avg7 = $derived.by((): number | null => {
		if (!maxDate || avgSeries.length === 0) return null;
		const cutoff = cutoffDate(maxDate, 7);
		const recent = avgSeries.filter(([d]) => d >= cutoff);
		if (!recent.length) return null;
		return Math.round((recent.reduce((a, pt) => a + pt[1], 0) / recent.length) * 10) / 10;
	});

	let avg28 = $derived.by((): number | null => {
		if (!maxDate || avgSeries.length === 0) return null;
		const cutoff = cutoffDate(maxDate, 28);
		const recent = avgSeries.filter(([d]) => d >= cutoff);
		if (!recent.length) return null;
		return Math.round((recent.reduce((a, pt) => a + pt[1], 0) / recent.length) * 10) / 10;
	});

	// Records for all providers in the selected state (compare tab)
	let compareRecords = $derived(
		allRecords.filter(
			(r) => r.state === selectedState && (r.fuelType === 'e10' || r.fuelType === 'ulp91'),
		),
	);

	// Per-provider average discount series for the compare tab
	let providerAvgSeries: Map<string, Array<[string, number]>> = $derived.by(() => {
		const byProvider = new Map<string, TgpRecord[]>();
		for (const r of compareRecords) {
			if (!byProvider.has(r.provider)) byProvider.set(r.provider, []);
			byProvider.get(r.provider)!.push(r);
		}
		const result = new Map<string, Array<[string, number]>>();
		for (const [provider, recs] of byProvider) {
			const termSeries = computeE10Discount(recs);
			const dateMap = new Map<string, number[]>();
			for (const [, pts] of termSeries) {
				for (const [date, val] of pts) {
					if (!dateMap.has(date)) dateMap.set(date, []);
					dateMap.get(date)!.push(val);
				}
			}
			const pts: Array<[string, number]> = [];
			for (const [date, vals] of dateMap) {
				pts.push([date, Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10]);
			}
			pts.sort((a, b) => a[0].localeCompare(b[0]));
			if (pts.length > 0) result.set(provider, pts);
		}
		return result;
	});

	// Summary table: last 7-day and 28-day averages per provider, sorted by 7-day avg
	let providerSummary = $derived.by(() => {
		if (!maxDate) return [];
		const cutoff7 = cutoffDate(maxDate, 7);
		const cutoff28 = cutoffDate(maxDate, 28);
		const rows: Array<{
			provider: string;
			name: string;
			colour: string;
			avg7: number | null;
			avg28: number | null;
		}> = [];
		for (const [provider, pts] of providerAvgSeries) {
			const recent7 = pts.filter(([d]) => d >= cutoff7);
			const recent28 = pts.filter(([d]) => d >= cutoff28);
			const a7 = recent7.length
				? Math.round((recent7.reduce((a, pt) => a + pt[1], 0) / recent7.length) * 10) / 10
				: null;
			const a28 = recent28.length
				? Math.round((recent28.reduce((a, pt) => a + pt[1], 0) / recent28.length) * 10) / 10
				: null;
			rows.push({
				provider,
				name: PROVIDER_MAP[provider]?.name ?? provider,
				colour: PROVIDER_MAP[provider]?.colour ?? '#94A3B8',
				avg7: a7,
				avg28: a28,
			});
		}
		return rows.sort((a, b) => {
			if (a.avg7 === null && b.avg7 === null) return 0;
			if (a.avg7 === null) return 1;
			if (b.avg7 === null) return -1;
			return a.avg7 - b.avg7;
		});
	});

	onMount(async () => {
		const result = await loadAllProviders();
		allRecords = result.records;
		loadErrors = result.errors;
		loading = false;
	});

	function fmtDiscount(v: number | null): string {
		if (v === null) return '—';
		const sign = v > 0 ? '+' : '';
		return `${sign}${v.toFixed(1)}¢/L`;
	}

	function discountColour(v: number | null): string {
		if (v === null) return 'text-slate-400';
		return v < 0 ? 'text-green-400' : 'text-red-400';
	}
</script>

<svelte:head>
	<title>E10 Discount Tracker</title>
	<meta name="description" content="Track E10 discount vs ULP 91 across Australian terminal gate fuel prices" />
</svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-100 font-sans">
	<header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
		<div class="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
			<div>
				<h1 class="text-base font-bold tracking-tight">E10 Discount Tracker</h1>
				<p class="text-xs text-slate-400 mt-0.5">E10 vs ULP 91 terminal gate price · Updated daily</p>
			</div>
			<div class="flex items-center gap-4">
				{#if !loading}
					<span class="text-xs text-slate-500">
						{PROVIDERS.length - loadErrors.length}/{PROVIDERS.length} providers
					</span>
				{/if}
				<a href="/dashboard" class="text-xs text-slate-500 hover:text-slate-300 transition-colors">
					Full dashboard →
				</a>
			</div>
		</div>
	</header>

	<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
		{#if loading}
			<div class="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
				<div class="w-8 h-8 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
				<p class="text-sm">Loading price data from all providers…</p>
			</div>
		{:else}
			{#if loadErrors.length > 0}
				<div class="mb-4 p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300">
					Failed to load: {loadErrors.map((e) => e.provider).join(', ')}
				</div>
			{/if}

			<!-- Controls -->
			<div class="flex flex-wrap items-center gap-4 mb-6">
				<div class="flex items-center gap-2">
					<label for="state-select" class="text-xs text-slate-400 font-medium">State</label>
					<select
						id="state-select"
						bind:value={selectedState}
						class="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
					>
						{#each STATES as state}
							<option value={state}>{state}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center gap-2">
					<label for="provider-select" class="text-xs text-slate-400 font-medium">Provider</label>
					<select
						id="provider-select"
						bind:value={selectedProvider}
						class="bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
					>
						{#each sortedProviders as p}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Tabs -->
			<div class="flex gap-1 mb-5 border-b border-slate-800">
				<button
					onclick={() => (activeTab = 'single')}
					class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px {activeTab === 'single' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}"
				>
					Single provider
				</button>
				<button
					onclick={() => (activeTab = 'compare')}
					class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px {activeTab === 'compare' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}"
				>
					All providers
				</button>
			</div>

			{#if activeTab === 'single'}
				<!-- Stats cards -->
				<div class="grid grid-cols-2 gap-3 mb-5">
					<div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
						<p class="text-xs text-slate-400 mb-1.5">Last 7 days avg</p>
						<p class="text-2xl font-bold {discountColour(avg7)}">{fmtDiscount(avg7)}</p>
						<p class="text-xs text-slate-500 mt-1">E10 vs ULP 91</p>
					</div>
					<div class="bg-slate-900 border border-slate-800 rounded-lg p-4">
						<p class="text-xs text-slate-400 mb-1.5">Last 28 days avg</p>
						<p class="text-2xl font-bold {discountColour(avg28)}">{fmtDiscount(avg28)}</p>
						<p class="text-xs text-slate-500 mt-1">E10 vs ULP 91</p>
					</div>
				</div>

				<p class="text-xs text-slate-500 mb-3">
					Grey lines show individual terminals. Bold line is the average. Green = E10 cheaper than ULP 91.
				</p>

				<E10FocusChart {terminalSeries} {avgSeries} />

			{:else}
				<p class="text-xs text-slate-500 mb-4">
					Average E10 discount vs ULP 91 per provider — {selectedState} terminals only.
				</p>

				<E10CompareChart series={providerAvgSeries} />

				{#if providerSummary.length > 0}
					<div class="mt-6">
						<h2 class="text-sm font-medium text-slate-300 mb-3">
							Provider summary — {selectedState}
						</h2>
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-slate-800">
										<th class="text-left py-2 pr-4 text-xs font-medium text-slate-400">Provider</th>
										<th class="text-right py-2 pr-4 text-xs font-medium text-slate-400">Last 7 days</th>
										<th class="text-right py-2 text-xs font-medium text-slate-400">Last 28 days</th>
									</tr>
								</thead>
								<tbody>
									{#each providerSummary as row}
										<tr class="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
											<td class="py-2.5 pr-4">
												<div class="flex items-center gap-2">
													<span
														class="w-2.5 h-2.5 rounded-full flex-shrink-0"
														style="background: {row.colour}"
													></span>
													<span class="text-slate-200">{row.name}</span>
												</div>
											</td>
											<td class="py-2.5 pr-4 text-right font-mono text-sm {discountColour(row.avg7)}">
												{fmtDiscount(row.avg7)}
											</td>
											<td class="py-2.5 text-right font-mono text-sm {discountColour(row.avg28)}">
												{fmtDiscount(row.avg28)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>
