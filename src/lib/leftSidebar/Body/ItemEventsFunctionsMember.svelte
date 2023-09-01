<script lang="ts" generics>
  import {
    TAB_VALUES_EVENT,
    TAB_VALUES_FUNCTION,
  } from "$lib/PageWrapper/PageWrapper.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import type { AbiFragmentsType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/ContractOverviewEventsFunctions.svelte";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import BaseItem from "./BaseItem.svelte";
  import { getFunctionSelectorWithSplitter } from "./ItemEventsFunctions.svelte";

  export let abiFragmentsType: AbiFragmentsType;
  export let targetAbiFragment: EventAbiFragment | FunctionAbiFragment;
  export let targetAbiFragmentsHref: string;
  const urlHash: string = convertToKebabCase(
    abiFragmentsType === "events"
      ? TAB_VALUES_EVENT[0]
      : TAB_VALUES_FUNCTION[0],
  );
  const targetAbiFragmentHref: string = `${targetAbiFragmentsHref}/${
    targetAbiFragment.name
  }${getFunctionSelectorWithSplitter(targetAbiFragment)}`;
</script>

<BaseItem
  hrefWithoutUrlHash={targetAbiFragmentHref}
  {urlHash}
  label={targetAbiFragment.name}
  size={sizeSettings.leftSidebarTree4th}
  hasChildren={false}
/>
