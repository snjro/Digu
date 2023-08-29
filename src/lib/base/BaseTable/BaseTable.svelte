<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import classNames from "classnames";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import type { BaseTableHeaderCellProps } from "./BaseTableHeaderCell.svelte";
  import BaseTableRow from "./BaseTableRow.svelte";
  import BaseTableHeaderCell from "./BaseTableHeaderCell.svelte";
  import SequenceHeaderCell from "./SequenceHeaderCell.svelte";
  import type { BaseSize } from "../baseSizes";
  import {
    getScrollbarStyle,
    type ScrollbarStyle,
  } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  export let tableHeaderCellProps: BaseTableHeaderCellProps[];
  export let borderX: boolean = false;
  export let borderTop: boolean = false;
  export let borderBottom: boolean = false;
  export let showSequenceNumbers = true;
  export let textSize: BaseSize;
  export let numOfTableRows: number;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  const colorCategoryBorder: ColorCategory =
    colorSettings.itemMemberTableBorder;

  let scrollbarStyle: ScrollbarStyle;
  $: scrollbarStyle = getScrollbarStyle(
    colorSettings.itemMemberTableBg,
    themeColor,
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
      <slot name="tableBody" />
    </tbody>
  </table>
</div>
