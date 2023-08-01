<script lang="ts">
  import type { Contract } from "@constants/chains/types";
  import BaseAccordion from "./BaseAccordion.svelte";
  import classNames from "classnames";
  import ItemContracts from "./ItemContracts.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  export let targetProjectVersionNameForLabel: string;
  export let targetProjectVersionHref: string;
  export let targetContracts: Contract[];
</script>

<div class={classNames("w-full", "h-fit", "")}>
  <BaseAccordion
    label={targetProjectVersionNameForLabel}
    iconName={undefined}
    hrefWithoutUrlHash={targetProjectVersionHref}
    isTopLevelItem
    showVerticalLine={false}
    size={sizeSettings.leftSidebarTreeTop}
  >
    <div class={classNames("pl-4")} slot="baseAccordionChildren">
      <ItemContracts {targetContracts} {targetProjectVersionHref} />
    </div>
  </BaseAccordion>
</div>
