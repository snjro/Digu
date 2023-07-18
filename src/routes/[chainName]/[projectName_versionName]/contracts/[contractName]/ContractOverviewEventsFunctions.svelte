<script lang="ts">
  import type { Contract } from "@constants/chains/types";
  import { page } from "$app/stores";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import BaseTable from "$lib/base/BaseTable/BaseTable.svelte";
  import BaseTableRow from "$lib/base/BaseTable/BaseTableRow.svelte";
  import SequenceBodyCell from "$lib/base/BaseTable/SequenceBodyCell.svelte";
  import BaseTableBodyCell from "$lib/base/BaseTable/BaseTableBodyCell.svelte";
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import classNames from "classnames";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { BaseSize } from "$lib/base/baseSizes";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import CommonViewMoreDetailsButton from "$lib/common/CommonViewMoreDetailsButton.svelte";

  export let listType: keyof Pick<Contract, "events" | "functions">;
  export let targetContract: Contract;

  const textSize: BaseSize = sizeSettings.itemMemberTable;
  const iconName: BaseIconProps["name"] =
    listType === "events" ? "databaseOutline" : "function";

  let nameList: string[];
  $: nameList = targetContract[listType].names;

  const singularListType: string = listType.slice(0, -1);
  const headerLabel: string = `${capitalizeFirstLetter(singularListType)} Name`;
  $: hrefFrontPart = `${$page.url.pathname}/${listType}`;
</script>

<CommonItemMember>
  {#if nameList.length > 0}
    <BaseTable
      tableHeaderCellProps={[
        {
          text: `${headerLabel}`,
          align: "center",
          textSize: textSize,
          width: "w-full",
        },
      ]}
      colorCategoryBorder={colorSettings.itemMemberTableBorderAndHover}
      {textSize}
      numOfTableRows={nameList.length}
      borderBottom={false}
    >
      <svelte:fragment slot="tableBody">
        {#each nameList as name, indexSortedEventNames}
          <BaseTableRow
            colorCategoryBgHover={colorSettings.itemMemberTableBorderAndHover}
          >
            <SequenceBodyCell
              rowIndex={indexSortedEventNames}
              {textSize}
              colorCategoryBorder={colorSettings.itemMemberTableBorderAndHover}
            />
            <BaseTableBodyCell align="left" {textSize}>
              <BaseA
                href={`${hrefFrontPart}/${name}`}
                text={name}
                prefixIcon={{
                  name: iconName,
                  colorCategory: "interactive",
                }}
                {textSize}
                openNewTab={false}
              />
            </BaseTableBodyCell>
          </BaseTableRow>
        {/each}
      </svelte:fragment>
    </BaseTable>
  {:else}
    <BaseLabel
      text={`The contract has no ${listType}.`}
      textSize={sizeSettings.itemWarnningMessage}
      italic
    />
  {/if}
</CommonItemMember>
{#if nameList.length > 0}
  <div class={classNames("h-full", "flex", "items-end", "justify-end")}>
    <CommonViewMoreDetailsButton
      size={sizeSettings.itemViewAllButton}
      href={hrefFrontPart}
    />
  </div>
{/if}
