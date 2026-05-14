<script lang="ts">
	import type { TgpRecord } from '$lib/types';
	import { FUEL_LABELS, PROVIDER_COLOURS } from '$lib/types';
	import { PROVIDER_MAP } from '$lib/sources';
	import { latestPrices } from '$lib/data';

	interface Props {
		records: TgpRecord[];
	}

	let { records }: Props = $props();

	let latest = $derived(latestPrices(records));

	// Group by provider for display
	let byProvider = $derived(() => {
		const map = new Map<string, TgpRecord[]>();
		for (const r of latest) {
			if (!map.has(r.provider)) map.set(r.provider, []);
			map.get(r.provider)!.push(r);
		}
		return map;
	});
</script>

<div class="overflow-x-auto">
	{#each [...byProvider().entries()] as [providerId, providerRecords]}
		{@const provider = PROVIDER_MAP[providerId]}
		<div class="mb-6">
			<h3 class="text-sm font-semibold mb-2 flex items-center gap-2">
				<span class="w-3 h-3 rounded-full inline-block" style="background:{provider?.colour ?? '#94A3B8'}"></span>
				{provider?.name ?? providerId}
			</h3>
			<table class="w-full text-sm border-collapse">
				<thead>
					<tr class="text-left text-slate-400 border-b border-slate-700">
						<th class="pb-1 pr-4 font-medium">State</th>
						<th class="pb-1 pr-4 font-medium">Location</th>
						<th class="pb-1 pr-4 font-medium">Fuel</th>
						<th class="pb-1 pr-4 font-medium text-right">Price</th>
						<th class="pb-1 font-medium">Date</th>
					</tr>
				</thead>
				<tbody>
					{#each providerRecords.sort((a, b) => `${a.state}${a.location}${a.fuelType}`.localeCompare(`${b.state}${b.location}${b.fuelType}`)) as row}
						<tr class="border-b border-slate-800 hover:bg-slate-800/40">
							<td class="py-1 pr-4 text-slate-300">{row.state}</td>
							<td class="py-1 pr-4 text-slate-300">{row.location || '–'}</td>
							<td class="py-1 pr-4 text-slate-400">{FUEL_LABELS[row.fuelType] ?? row.fuelType}</td>
							<td class="py-1 pr-4 text-right font-mono font-medium text-white">{row.priceCpl.toFixed(1)}¢</td>
							<td class="py-1 text-slate-400 text-xs">{row.date}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
</div>
