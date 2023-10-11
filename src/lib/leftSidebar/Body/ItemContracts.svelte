<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { Contract } from "@constants/chains/types";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import { DIR_NAME_CONTRACTS } from "@utils/utilsCostants";
  import BaseAccordion from "./BaseAccordion.svelte";
  import ItemContractsMember from "./ItemContractsMember.svelte";

  export let targetContracts: Contract[];
  export let targetProjectVersionHref: string;
  const targetContractsHref = `${targetProjectVersionHref}/${DIR_NAME_CONTRACTS}`;
</script>

<BaseAccordion
  label={capitalizeFirstLetter(DIR_NAME_CONTRACTS)}
  iconName={undefined}
  hrefWithoutUrlHash={targetContractsHref}
  size={sizeSettings.leftSidebarTree2nd}
>
  <svelte:fragment slot="baseAccordionChildren">
    {#each targetContracts as targetContract (targetContract.name)}
      <ItemContractsMember {targetContract} {targetContractsHref} />
    {/each}
  </svelte:fragment>
</BaseAccordion>
