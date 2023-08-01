<script lang="ts" context="module">
  export type AbiFragmentsType = keyof Pick<Contract, "events" | "functions">;
</script>

<script lang="ts">
  import type { Contract } from "@constants/chains/types";
  import { page } from "$app/stores";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import {
    capitalizeFirstLetter,
    convertToKebabCase,
  } from "@utils/utilsCommon";
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
  import { tabValuesForEvent } from "./events/[eventName]/+page.svelte";
  import { tabValuesForFunction } from "./functions/[functionName]/+page.svelte";

  export let abiFragmentsType: AbiFragmentsType;
  export let targetContract: Contract;

  const textSize: BaseSize = sizeSettings.itemMemberTable;
  const iconName: BaseIconProps["name"] =
    abiFragmentsType === "events" ? "databaseOutline" : "function";

  let nameList: string[];
  $: nameList = targetContract[abiFragmentsType].names;

  const singularListType: string = abiFragmentsType.slice(0, -1);
  const headerLabel: string = `${capitalizeFirstLetter(singularListType)} Name`;
  $: hrefFrontPart = `${$page.url.pathname}/${abiFragmentsType}`;

  let hrefEventFunctionName: (eventFunctionName: string) => string;
  hrefEventFunctionName = (eventFunctionName: string): string => {
    const urlHash: string =
      abiFragmentsType === "events"
        ? convertToKebabCase(tabValuesForEvent[0])
        : convertToKebabCase(tabValuesForFunction[0]);
    return `${hrefFrontPart}/${eventFunctionName}#${urlHash}`;
  };
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
      {textSize}
      numOfTableRows={nameList.length}
      borderBottom={false}
    >
      <svelte:fragment slot="tableBody">
        {#each nameList as name, indexSortedEventNames}
          <BaseTableRow>
            <SequenceBodyCell
              rowIndex={indexSortedEventNames}
              {textSize}
              colorCategoryBorder={colorSettings.itemMemberTableBorder}
            />
            <BaseTableBodyCell align="left" {textSize}>
              <BaseA
                href={`${hrefEventFunctionName(name)}`}
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
      text={`The contract has no ${abiFragmentsType}.`}
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
