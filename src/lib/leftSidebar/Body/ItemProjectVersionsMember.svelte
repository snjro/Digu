<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { Contract } from "@constants/chains/types";
  import BaseAccordion from "./BaseAccordion.svelte";
  import ItemContracts from "./ItemContracts.svelte";
  interface Props {
    targetProjectVersionNameForLabel: string;
    targetProjectVersionHref: string;
    targetContracts: Contract[];
  }

  let {
    targetProjectVersionNameForLabel,
    targetProjectVersionHref,
    targetContracts,
  }: Props = $props();
</script>

<BaseAccordion
  label={targetProjectVersionNameForLabel}
  iconName={undefined}
  hrefWithoutUrlHash={targetProjectVersionHref}
  isTopLevelItem
  showVerticalLine={false}
  size={sizeSettings.leftSidebarTree1st}
>
  {#snippet baseAccordionChildren()}
    <ItemContracts {targetContracts} {targetProjectVersionHref} />
  {/snippet}
</BaseAccordion>
