<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { Contract } from "@constants/chains/types";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import { DIR_NAME_CONTRACTS } from "@utils/utilsConstants";
  import BaseAccordion from "./BaseAccordion.svelte";
  import ItemContractsMember from "./ItemContractsMember.svelte";

  interface Props {
    targetContracts: Contract[];
    targetProjectVersionHref: string;
  }

  let { targetContracts, targetProjectVersionHref }: Props = $props();
  let targetContractsHref = $derived(
    `${targetProjectVersionHref}/${DIR_NAME_CONTRACTS}`,
  );
</script>

<BaseAccordion
  label={capitalizeFirstLetter(DIR_NAME_CONTRACTS)}
  iconName={undefined}
  hrefWithoutUrlHash={targetContractsHref}
  size={sizeSettings.leftSidebarTree2nd}
>
  {#snippet baseAccordionChildren()}
    {#each targetContracts as targetContract (targetContract.name)}
      <ItemContractsMember {targetContract} {targetContractsHref} />
    {/each}
  {/snippet}
</BaseAccordion>
