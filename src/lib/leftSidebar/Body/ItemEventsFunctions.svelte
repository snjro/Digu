<script lang="ts" context="module">
  const FUNC_NAME_SPLITTER = "-";
  function isFunctionAbiFragment(
    targetAbiFragment: EventAbiFragment | FunctionAbiFragment
  ): targetAbiFragment is FunctionAbiFragment {
    return targetAbiFragment.type === "function";
  }
  export function getFunctionSelectorWithSplitter(
    targetAbiFragment: EventAbiFragment | FunctionAbiFragment
  ): string {
    return isFunctionAbiFragment(targetAbiFragment)
      ? `${FUNC_NAME_SPLITTER}${targetAbiFragment.selector}` // hyphens are not allowed in function names on Solidity.
      : "";
  }
  export function getSplittedFunctionNameAndSelector(
    functionNameAndSelector: string
  ): {
    functionName: FunctionAbiFragment["name"];
    functionSelector: FunctionAbiFragment["selector"];
  } {
    const splitted: string[] =
      functionNameAndSelector.split(FUNC_NAME_SPLITTER);
    if (splitted.length === 2) {
      return {
        functionName: splitted[0],
        functionSelector: splitted[1],
      };
    } else {
      const errorMessage: string = `The lengh of splitted FunctionNameAndSelector should be 2.`;
      myLogger.error(
        errorMessage,
        `splitted.length: ${splitted.length}`,
        `functionNameAndSelector: ${functionNameAndSelector}`
      );
      throw new Error(errorMessage);
    }
  }
</script>

<script lang="ts">
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import BaseAccordion from "./BaseAccordion.svelte";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import type { AbiFragmentsType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/ContractOverviewEventsFunctions.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import ItemEventsFunctionsMember from "./ItemEventsFunctionsMember.svelte";
  import { myLogger } from "@utils/logger";

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
