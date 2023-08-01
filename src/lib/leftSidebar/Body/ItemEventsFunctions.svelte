<script lang="ts" generics>
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import BaseAccordion from "./BaseAccordion.svelte";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import type { AbiFragmentsType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/ContractOverviewEventsFunctions.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import ItemEventsFunctionsMember from "./ItemEventsFunctionsMember.svelte";

  export let abiFragmentsType: AbiFragmentsType;
  export let targetAbiFragments: EventAbiFragment[] | FunctionAbiFragment[];
  export let targetContractHref: string;

  const targetAbiFragmentsHref: string = `${targetContractHref}/${abiFragmentsType}`;
</script>

{#if targetAbiFragments.length > 0}
  <BaseAccordion
    label={capitalizeFirstLetter(abiFragmentsType)}
    iconName={abiFragmentsType === "events" ? "databaseOutline" : "function"}
    hrefWithoutUrlHash={targetAbiFragmentsHref}
    showVerticalLine
    size={sizeSettings.leftSidebarTreeBottom}
  >
    <svelte:fragment slot="baseAccordionChildren">
      {#each targetAbiFragments as targetAbiFragment, idx (`${targetAbiFragment.name}_${idx}`)}
        <ItemEventsFunctionsMember
          {abiFragmentsType}
          {targetAbiFragment}
          {targetAbiFragmentsHref}
        />
      {/each}
    </svelte:fragment>
  </BaseAccordion>
{/if}
