<script lang="ts">
  import type { Contract } from "@constants/chains/types";
  import BaseAccordion from "./BaseAccordion.svelte";
  import ItemContracts from "./ItemContracts.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  export let targetProjectVersionNameForLabel: string;
  export let targetProjectVersionHref: string;
  export let targetContracts: Contract[];
</script>

<BaseAccordion
  label={targetProjectVersionNameForLabel}
  iconName={undefined}
  hrefWithoutUrlHash={targetProjectVersionHref}
  isTopLevelItem
  showVerticalLine={false}
  size={sizeSettings.leftSidebarTree1st}
>
  <svelte:fragment slot="baseAccordionChildren">
    <ItemContracts {targetContracts} {targetProjectVersionHref} />
  </svelte:fragment>
</BaseAccordion>
