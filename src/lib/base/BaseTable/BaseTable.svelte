<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { type ColorCategory } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import {
    getScrollbarStyle,
    type ScrollbarStyle,
  } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";
  import classNames from "classnames";
  import type { BaseSize } from "../baseSizes";
  import type { BaseTableHeaderCellProps } from "./BaseTableHeaderCell.svelte";
  import BaseTableHeaderCell from "./BaseTableHeaderCell.svelte";
  import BaseTableRow from "./BaseTableRow.svelte";
  import SequenceHeaderCell from "./SequenceHeaderCell.svelte";
  import type { Snippet } from "svelte";
  import { focusableWhenScrolling } from "../focusableWhenScrolling";

  interface Props {
    tableHeaderCellProps: BaseTableHeaderCellProps[];
    borderX?: boolean;
    borderTop?: boolean;
    borderBottom?: boolean;
    showSequenceNumbers?: boolean;
    textSize: BaseSize;
    numOfTableRows: number;
    tableBody?: Snippet;
    scrollAreaLabel?: string;
  }

  let {
    tableHeaderCellProps,
    borderX = false,
    borderTop = false,
    borderBottom = false,
    showSequenceNumbers = true,
    textSize,
    numOfTableRows,
    tableBody,
    scrollAreaLabel = "Table",
  }: Props = $props();

  const colorCategoryBorder: ColorCategory =
    colorSettings.itemMemberTableBorder;

  let scrollbarStyle: ScrollbarStyle = $derived(
    getScrollbarStyle(colorSettings.itemMemberTableBg),
  );
</script>

<div
  class={classNames("overflow-x-auto", scrollbarStyle.thin, "")}
  use:focusableWhenScrolling={scrollAreaLabel}
>
  <table
    class={classNames(
      "table-fixed",
      "h-auto",
      borderX && "border-x",
      borderTop && "border-t",
      borderBottom && "border-b",
      colorClasses[colorCategoryBorder].border,
    )}
  >
    <thead
      class={classNames("border-b", colorClasses[colorCategoryBorder].border)}
    >
      <BaseTableRow hoverEffect={false}>
        {#if showSequenceNumbers}
          <SequenceHeaderCell
            {textSize}
            {colorCategoryBorder}
            {numOfTableRows}
          />
        {/if}
        <!-- Fixed list of header cells, reused by position. -->
        <!-- eslint-disable-next-line svelte/require-each-key -->
        {#each tableHeaderCellProps as tableHeaderCellProp}
          <BaseTableHeaderCell {...tableHeaderCellProp} />
        {/each}
      </BaseTableRow>
    </thead>
    <tbody class={classNames("")}>
      {@render tableBody?.()}
    </tbody>
  </table>
</div>
