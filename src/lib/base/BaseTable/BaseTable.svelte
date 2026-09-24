<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import {
    getScrollbarStyle,
    type ScrollbarStyle,
  } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { BaseSize } from "../baseSizes";
  import type { BaseTableHeaderCellProps } from "./BaseTableHeaderCell.svelte";
  import BaseTableHeaderCell from "./BaseTableHeaderCell.svelte";
  import BaseTableRow from "./BaseTableRow.svelte";
  import SequenceHeaderCell from "./SequenceHeaderCell.svelte";
  import type { Snippet } from "svelte";

  interface Props {
    tableHeaderCellProps: BaseTableHeaderCellProps[];
    borderX?: boolean;
    borderTop?: boolean;
    borderBottom?: boolean;
    showSequenceNumbers?: boolean;
    textSize: BaseSize;
    numOfTableRows: number;
    tableBody?: Snippet;
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
  }: Props = $props();
  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  const colorCategoryBorder: ColorCategory =
    colorSettings.itemMemberTableBorder;

  let scrollbarStyle: ScrollbarStyle = $derived(
    getScrollbarStyle(colorSettings.itemMemberTableBg, themeColor),
  );
</script>

<div class={classNames("overflow-x-auto", scrollbarStyle.thin, "")}>
  <table
    class={classNames(
      "table-fixed",
      "h-auto",
      borderX && "border-x",
      borderTop && "border-t",
      borderBottom && "border-b",
      colorDefinitions[themeColor][colorCategoryBorder].border,
    )}
  >
    <thead
      class={classNames(
        "border-b",
        colorDefinitions[themeColor][colorCategoryBorder].border,
      )}
    >
      <BaseTableRow hoverEffect={false}>
        {#if showSequenceNumbers}
          <SequenceHeaderCell
            {textSize}
            {colorCategoryBorder}
            {numOfTableRows}
          />
        {/if}
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
