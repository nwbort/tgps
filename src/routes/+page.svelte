<script lang="ts">
	import { onMount } from 'svelte';
	import type { FuelType, StateCode, TgpRecord } from '$lib/types';
	import { filterRecords, loadAllProviders } from '$lib/data';
	import { PROVIDERS } from '$lib/sources';
	import PriceHistoryChart from '$lib/components/PriceHistoryChart.svelte';
	import SpreadChart from '$lib/components/SpreadChart.svelte';
	import LatestPricesTable from '$lib/components/LatestPricesTable.svelte';
	import FilterPanel from '$lib/components/FilterPanel.svelte';

	type Tab = 'history' | 'compare' | 'spread' | 'latest';

	let allRecords: TgpRecord[] = $state([]);
	let loadErrors: Array<{ provider: string; message: string }> = $state([]);
	let loading = $state(true);

	let selectedProviders: string[] = $state(PROVIDERS.map((p) => p.id));
	let selectedFuels: FuelType[] = $state([]);
	let selectedStates: StateCode[] = $state([]);
	let dateFrom = $state('');
	let dateTo = $state('');
	let activeTab: Tab = $state('history');
	let historyGroupBy: 'provider' | 'fuelType' = $state('provider');

	let availableFuels = $derived([...new Set(allRecords.map((r) => r.fuelType))].sort() as FuelType[]);
	let availableStates = $derived([...new Set(allRecords.map((r) => r.state))].sort() as StateCode[]);

	$effect(() => {
		if (selectedFuels.length === 0 && availableFuels.length > 0) {
			selectedFuels = [...availableFuels];
		}
		if (selectedStates.length === 0 && availableStates.length > 0) {
			selectedStates = [...availableStates];
		}
	});

	let filtered = $derived(
		filterRecords(allRecords, {
			providers: selectedProviders,
			fuelTypes: selectedFuels,
			states: selectedStates,
			dateFrom: dateFrom || undefined,
			dateTo: dateTo || undefined,
		}),
	);

	onMount(async () => {
		const result = await loadAllProviders();
		allRecords = result.records;
		loadErrors = result.errors;
		loading = false;
	});

	const FUEL_LABEL_MAP: Record<string, string> = {
		ulp91: 'ULP 91', e10: 'E10', p95: 'Premium 95',
		p98: 'Premium 98', diesel: 'Diesel', b5: 'Biodiesel B5', prediesel: 'Premium Diesel',
	};

	const tabs: Array<{ id: Tab; label: string }> = [
		{ id: 'history', label: 'Price history' },
		{ id: 'compare', label: 'By fuel type' },
		{ id: 'spread', label: 'Provider spread' },
		{ id: 'latest', label: 'Latest prices' },
	];

	let spreadBaseProvider = $derived(() => {
		const ids = [...new Set(filtered.map((r) => r.provider))];
		return ids[0] ? (PROVIDERS.find((p) => p.id === ids[0])?.name ?? ids[0]) : '';
	});
</script>

<svelte:head>
	<title>Australian TGP Tracker</title>
	<meta name="description" content="Track Australian terminal gate fuel prices across all major providers" />
</svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-100 font-sans">
	<header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
			<div>
				<h1 class="text-base font-bold tracking-tight">Australian TGP Tracker</h1>
				<p class="text-xs text-slate-400 mt-0.5">Terminal gate fuel prices · Updated daily</p>
			</div>
			{#if !loading}
				<div class="text-xs text-slate-500">
					{allRecords.length.toLocaleString()} records · {PROVIDERS.length - loadErrors.length}/{PROVIDERS.length} providers
				</div>
			{/if}
		</div>
	</header>

	<div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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

			<div class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
				<aside class="lg:pt-1">
					<FilterPanel
						bind:selectedProviders
						bind:selectedFuels
						bind:selectedStates
						bind:dateFrom
						bind:dateTo
						{availableFuels}
						{availableStates}
					/>
				</aside>

				<main class="min-w-0">
					<div class="flex gap-1 mb-5 border-b border-slate-800">
						{#each tabs as tab}
							<button
								onclick={() => (activeTab = tab.id)}
								class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px {activeTab === tab.id ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}"
							>
								{tab.label}
							</button>
						{/each}
					</div>

					{#if activeTab === 'history'}
						<div class="mb-3 flex items-center gap-3">
							<span class="text-xs text-slate-400">Group by:</span>
							<div class="flex rounded overflow-hidden border border-slate-700 text-xs">
								<button
									onclick={() => (historyGroupBy = 'provider')}
									class="px-3 py-1.5 transition-colors {historyGroupBy === 'provider' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}"
								>Provider</button>
								<button
									onclick={() => (historyGroupBy = 'fuelType')}
									class="px-3 py-1.5 transition-colors {historyGroupBy === 'fuelType' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}"
								>Fuel type</button>
							</div>
						</div>
						{#if filtered.length === 0}
							{@render emptyState()}
						{:else}
							<PriceHistoryChart records={filtered} groupBy={historyGroupBy} />
						{/if}

					{:else if activeTab === 'compare'}
						<div class="space-y-6">
							{#each selectedFuels as fuel}
								{@const fuelRecords = filtered.filter((r) => r.fuelType === fuel)}
								{#if fuelRecords.length > 0}
									<div>
										<h3 class="text-sm font-medium text-slate-300 mb-2">
											{FUEL_LABEL_MAP[fuel] ?? fuel}
										</h3>
										<PriceHistoryChart records={fuelRecords} groupBy="provider" height="300px" />
									</div>
								{/if}
							{/each}
						</div>

					{:else if activeTab === 'spread'}
						{#if filtered.length === 0}
							{@render emptyState()}
						{:else}
							<p class="text-xs text-slate-400 mb-3">
								Spread relative to {spreadBaseProvider()}
							</p>
							<SpreadChart records={filtered} />
						{/if}

					{:else if activeTab === 'latest'}
						{#if filtered.length === 0}
							{@render emptyState()}
						{:else}
							<LatestPricesTable records={filtered} />
						{/if}
					{/if}
				</main>
			</div>
		{/if}
	</div>
</div>

{#snippet emptyState()}
	<div class="flex items-center justify-center py-20 text-slate-500 text-sm">
		No data matches the current filters.
	</div>
{/snippet}
