<script lang="ts">
	import type { FuelType, StateCode } from '$lib/types';
	import { FUEL_LABELS } from '$lib/types';
	import { PROVIDERS } from '$lib/sources';

	interface Props {
		selectedProviders: string[];
		selectedFuels: FuelType[];
		selectedStates: StateCode[];
		availableFuels: FuelType[];
		availableStates: StateCode[];
		dateFrom: string;
		dateTo: string;
	}

	let {
		selectedProviders = $bindable(),
		selectedFuels = $bindable(),
		selectedStates = $bindable(),
		availableFuels,
		availableStates,
		dateFrom = $bindable(),
		dateTo = $bindable(),
	}: Props = $props();

	function toggle<T>(arr: T[], value: T): T[] {
		return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
	}
</script>

<div class="space-y-5">
	<!-- Providers -->
	<div>
		<div class="flex items-center justify-between mb-2">
			<span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Providers</span>
			<div class="flex gap-2 text-xs text-slate-500">
				<button onclick={() => selectedProviders = PROVIDERS.map(p => p.id)} class="hover:text-slate-300 transition-colors">All</button>
				<span>·</span>
				<button onclick={() => selectedProviders = []} class="hover:text-slate-300 transition-colors">None</button>
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each PROVIDERS as p}
				<button
					onclick={() => selectedProviders = toggle(selectedProviders, p.id)}
					class="px-2.5 py-1 rounded text-xs font-medium transition-all border"
					style="border-color: {p.colour}; background: {selectedProviders.includes(p.id) ? p.colour + '33' : 'transparent'}; color: {selectedProviders.includes(p.id) ? '#fff' : '#94A3B8'}"
				>
					{p.name}
				</button>
			{/each}
		</div>
	</div>

	<!-- Fuel types -->
	<div>
		<div class="flex items-center justify-between mb-2">
			<span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fuel type</span>
			<div class="flex gap-2 text-xs text-slate-500">
				<button onclick={() => selectedFuels = [...availableFuels]} class="hover:text-slate-300 transition-colors">All</button>
				<span>·</span>
				<button onclick={() => selectedFuels = []} class="hover:text-slate-300 transition-colors">None</button>
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each availableFuels as fuel}
				<button
					onclick={() => selectedFuels = toggle(selectedFuels, fuel)}
					class="px-2.5 py-1 rounded text-xs font-medium transition-all border border-slate-600 {selectedFuels.includes(fuel) ? 'bg-slate-600 text-white' : 'text-slate-400 hover:border-slate-400'}"
				>
					{FUEL_LABELS[fuel] ?? fuel}
				</button>
			{/each}
		</div>
	</div>

	<!-- States -->
	{#if availableStates.length > 1}
	<div>
		<div class="flex items-center justify-between mb-2">
			<span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">State</span>
			<div class="flex gap-2 text-xs text-slate-500">
				<button onclick={() => selectedStates = [...availableStates]} class="hover:text-slate-300 transition-colors">All</button>
				<span>·</span>
				<button onclick={() => selectedStates = []} class="hover:text-slate-300 transition-colors">None</button>
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each availableStates as state}
				<button
					onclick={() => selectedStates = toggle(selectedStates, state)}
					class="px-2.5 py-1 rounded text-xs font-medium transition-all border border-slate-600 {selectedStates.includes(state) ? 'bg-slate-600 text-white' : 'text-slate-400 hover:border-slate-400'}"
				>
					{state}
				</button>
			{/each}
		</div>
	</div>
	{/if}

	<!-- Date range -->
	<div>
		<span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Date range</span>
		<div class="flex gap-2 items-center">
			<input
				type="date"
				bind:value={dateFrom}
				class="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-slate-400 w-36"
			/>
			<span class="text-slate-500 text-xs">to</span>
			<input
				type="date"
				bind:value={dateTo}
				class="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-slate-400 w-36"
			/>
		</div>
	</div>
</div>
