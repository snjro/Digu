<script lang="ts" generics>
  import { getFirstTabUrlHash } from "$lib/PageWrapper/tabs";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import type { AbiFragmentsType } from "$lib/contracts/abiFragmentsType";
  import BaseItem from "./BaseItem.svelte";
  import { getAbiFragmentHref } from "./functionNameHandler";

  interface Props {
    abiFragmentsType: AbiFragmentsType;
    targetAbiFragment: EventAbiFragment | FunctionAbiFragment;
    targetAbiFragmentsHref: string;
  }

  let { abiFragmentsType, targetAbiFragment, targetAbiFragmentsHref }: Props =
    $props();
  let urlHash: string = $derived(getFirstTabUrlHash(abiFragmentsType));
  let targetAbiFragmentHref: string = $derived(
    getAbiFragmentHref(targetAbiFragmentsHref, targetAbiFragment),
  );
</script>

<BaseItem
  hrefWithoutUrlHash={targetAbiFragmentHref}
  {urlHash}
  label={targetAbiFragment.name}
  size={sizeSettings.leftSidebarTree4th}
  hasChildren={false}
/>
