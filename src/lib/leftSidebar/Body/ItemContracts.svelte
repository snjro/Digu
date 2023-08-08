<script lang="ts">
  import type { Contract } from "@constants/chains/types";
  import BaseAccordion from "./BaseAccordion.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import ItemContractsMember from "./ItemContractsMember.svelte";

  export let targetContracts: Contract[];
  export let targetProjectVersionHref: string;
  const targetContractsHref = `${targetProjectVersionHref}/contracts`;
</script>

<BaseAccordion
  label="Contracts"
  iconName={undefined}
  hrefWithoutUrlHash={targetContractsHref}
  size={sizeSettings.leftSidebarTree2nd}
  layerLevel={1}
>
  <svelte:fragment slot="baseAccordionChildren">
    {#each targetContracts as targetContract (targetContract.name)}
      <ItemContractsMember {targetContract} {targetContractsHref} />
    {/each}
  </svelte:fragment>
</BaseAccordion>
