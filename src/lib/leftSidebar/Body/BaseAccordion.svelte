<script lang="ts">
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  import type { Snippet } from "svelte";
  import BaseAccordionChildren from "./BaseAccordionChildren.svelte";
  import BaseAccordionHeader from "./BaseAccordionHeader.svelte";
  import type { BaseAccordionHeaderSuffixIcon } from "./BaseAccordionHeaderSuffixIcons.svelte";

  interface Props {
    label: string;
    hrefWithoutUrlHash: string;
    urlHash?: string | undefined;
    size: BaseSize;
    iconName?: BaseIconProps["name"] | undefined;
    isTopLevelItem?: boolean;
    showVerticalLine?: boolean;
    suffixIcons?: BaseAccordionHeaderSuffixIcon[];
    baseAccordionChildren?: Snippet;
  }

  let {
    label,
    hrefWithoutUrlHash,
    urlHash = undefined,
    size,
    iconName = undefined,
    isTopLevelItem = false,
    showVerticalLine = true,
    suffixIcons = [],
    baseAccordionChildren,
  }: Props = $props();
  let isOpenAccordion = $state(true);
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

  <BaseAccordionChildren
    {isOpenAccordion}
    {showVerticalLine}
    {baseAccordionChildren}
  />
</div>
