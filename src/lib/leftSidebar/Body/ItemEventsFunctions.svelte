<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import type { AbiFragmentsType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/abiFragmentsType";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import BaseAccordion from "./BaseAccordion.svelte";
  import ItemEventsFunctionsMember from "./ItemEventsFunctionsMember.svelte";
  import { getFunctionSelectorWithSplitter } from "./functionNameHandler";

  interface Props {
    abiFragmentsType: AbiFragmentsType;
    targetAbiFragments: EventAbiFragment[] | FunctionAbiFragment[];
    targetContractHref: string;
  }

  let { abiFragmentsType, targetAbiFragments, targetContractHref }: Props =
    $props();

  let targetAbiFragmentsHref: string = $derived(
    `${targetContractHref}/${abiFragmentsType}`,
  );
</script>

{#if targetAbiFragments.length > 0}
  <BaseAccordion
    label={capitalizeFirstLetter(abiFragmentsType)}
    iconName={abiFragmentsType === "events" ? "databaseOutline" : "function"}
    hrefWithoutUrlHash={targetAbiFragmentsHref}
    size={sizeSettings.leftSidebarTree3rd}
  >
    {#snippet baseAccordionChildren()}
      <!-- Add functionSelector to the key because "targetAbiFragment.name" is not unique.
             A contract can have overriding function. -->
      {#each targetAbiFragments as targetAbiFragment (`${targetAbiFragment.name}${getFunctionSelectorWithSplitter(targetAbiFragment)}`)}
        <ItemEventsFunctionsMember
          {abiFragmentsType}
          {targetAbiFragment}
          {targetAbiFragmentsHref}
        />
      {/each}
    {/snippet}
  </BaseAccordion>
{/if}
