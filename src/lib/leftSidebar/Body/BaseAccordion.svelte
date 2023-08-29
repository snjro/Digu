<script lang="ts">
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import BaseAccordionChildren from "./BaseAccordionChildren.svelte";
  import BaseAccordionHeader from "./BaseAccordionHeader.svelte";
  import type { BaseAccordionHeaderSuffixIcon } from "./BaseAccordionHeaderSuffixIcons.svelte";

  export let label: string;
  export let hrefWithoutUrlHash: string;
  export let urlHash: string | undefined = undefined;
  export let size: BaseSize;
  export let iconName: BaseIconProps["name"] | undefined = undefined;
  export let isTopLevelItem: boolean = false;
  export let showVerticalLine: boolean = true;
  export let suffixIcons: BaseAccordionHeaderSuffixIcon[] = [];
  let isOpenAccordion = true;
</script>

<div class={classNames("flex-initial", "flex", "flex-col", "w-full", "")}>
  <BaseAccordionHeader
    {label}
    {hrefWithoutUrlHash}
    {urlHash}
    {size}
    {iconName}
    {isTopLevelItem}
    {suffixIcons}
    bind:isOpenAccordion
  />

  <BaseAccordionChildren {isOpenAccordion} {showVerticalLine}>
    <slot slot="baseAccordionChildren" name="baseAccordionChildren" />
  </BaseAccordionChildren>
</div>
