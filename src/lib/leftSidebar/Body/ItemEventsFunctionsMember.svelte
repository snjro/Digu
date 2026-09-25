<script lang="ts" generics>
  import { TAB_VALUES_EVENT, TAB_VALUES_FUNCTION } from "$lib/PageWrapper/tabs";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import type { AbiFragmentsType } from "$lib/contracts/abiFragmentsType";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import BaseItem from "./BaseItem.svelte";
  import { getFunctionSelectorWithSplitter } from "./functionNameHandler";

  interface Props {
    abiFragmentsType: AbiFragmentsType;
    targetAbiFragment: EventAbiFragment | FunctionAbiFragment;
    targetAbiFragmentsHref: string;
  }

  let { abiFragmentsType, targetAbiFragment, targetAbiFragmentsHref }: Props =
    $props();
  let urlHash: string = $derived(
    convertToKebabCase(
      abiFragmentsType === "events"
        ? TAB_VALUES_EVENT[0]
        : TAB_VALUES_FUNCTION[0],
    ),
  );
  let targetAbiFragmentHref: string = $derived(
    `${targetAbiFragmentsHref}/${
      targetAbiFragment.name
    }${getFunctionSelectorWithSplitter(targetAbiFragment)}`,
  );
</script>

<BaseItem
  hrefWithoutUrlHash={targetAbiFragmentHref}
  {urlHash}
  label={targetAbiFragment.name}
  size={sizeSettings.leftSidebarTree4th}
  hasChildren={false}
/>
