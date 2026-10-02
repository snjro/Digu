<script lang="ts" generics>
  import { getFirstTabUrlHash } from "#lib/PageWrapper/tabs.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import type {
    EventAbiFragment,
    FunctionAbiFragment,
  } from "#constants/chains/types.js";
  import type { AbiFragmentsType } from "#lib/contracts/abiFragmentsType.js";
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
