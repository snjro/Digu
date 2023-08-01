<script lang="ts" generics>
  import BaseItem from "./BaseItem.svelte";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import type { AbiFragmentsType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/ContractOverviewEventsFunctions.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { changeSize } from "$lib/base/baseSizes";
  import { tabValuesForEvent } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/+page.svelte";
  import { tabValuesForFunction } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/functions/[functionName]/+page.svelte";

  export let abiFragmentsType: AbiFragmentsType;
  export let targetAbiFragment: EventAbiFragment | FunctionAbiFragment;
  export let targetAbiFragmentsHref: string;

  const urlHash: string = convertToKebabCase(
    abiFragmentsType === "events"
      ? tabValuesForEvent[0]
      : tabValuesForFunction[0]
  );
  const targetAbiFragmentHref: string = `${targetAbiFragmentsHref}/${targetAbiFragment.name}`;
</script>

<BaseItem
  hrefWithoutUrlHash={targetAbiFragmentHref}
  {urlHash}
  label={targetAbiFragment.name}
  size={changeSize(sizeSettings.leftSidebarTreeBottom, -1)}
/>
