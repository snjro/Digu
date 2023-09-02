<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import type { AbiFragmentsType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/ContractOverviewEventsFunctions.svelte";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import BaseAccordion from "./BaseAccordion.svelte";
  import ItemEventsFunctionsMember from "./ItemEventsFunctionsMember.svelte";
  import { getFunctionSelectorWithSplitter } from "./functionNameHandler";

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
    size={sizeSettings.leftSidebarTree3rd}
  >
    <svelte:fragment slot="baseAccordionChildren">
      <!-- Add functionSelector to the key because "targetAbiFragment.name" is not unique.
           A contract can have overriding function. -->
      {#each targetAbiFragments as targetAbiFragment (`${targetAbiFragment.name}${getFunctionSelectorWithSplitter(targetAbiFragment)}`)}
        <ItemEventsFunctionsMember
          {abiFragmentsType}
          {targetAbiFragment}
          {targetAbiFragmentsHref}
        />
      {/each}
    </svelte:fragment>
  </BaseAccordion>
{/if}
