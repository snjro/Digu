<script lang="ts" context="module">
  export type AbiFragmentsType = keyof Pick<Contract, "events" | "functions">;
</script>

<script lang="ts">
  import { page } from "$app/stores";
  import {
    TAB_VALUES_EVENT,
    TAB_VALUES_FUNCTION,
  } from "$lib/PageWrapper/PageWrapper.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import BaseTable from "$lib/base/BaseTable/BaseTable.svelte";
  import BaseTableBodyCell from "$lib/base/BaseTable/BaseTableBodyCell.svelte";
  import BaseTableRow from "$lib/base/BaseTable/BaseTableRow.svelte";
  import SequenceBodyCell from "$lib/base/BaseTable/SequenceBodyCell.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonViewMoreDetailsButton from "$lib/common/CommonViewMoreDetailsButton.svelte";
  import { getFunctionSelectorWithSplitter } from "$lib/leftSidebar/Body/functionNameHandler";
  import type {
    Contract,
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import { trailingSlash } from "@routes/+layout";
  import {
    capitalizeFirstLetter,
    convertToKebabCase,
  } from "@utils/utilsCommon";

  export let abiFragmentsType: AbiFragmentsType;
  export let targetContract: Contract;

  const textSize: BaseSize = sizeSettings.itemMemberTable;
  const iconName: BaseIconProps["name"] =
    abiFragmentsType === "events" ? "databaseOutline" : "function";

  let abiFragments: FunctionAbiFragment[] | EventAbiFragment[];
  $: abiFragments = targetContract[abiFragmentsType].abiFragments;

  const singularListType: string = abiFragmentsType.slice(0, -1);
  const headerLabel: string = `${capitalizeFirstLetter(singularListType)} Name`;
  $: hrefFrontPart =
    trailingSlash === "always"
      ? `${$page.url.pathname}${abiFragmentsType}`
      : `${$page.url.pathname}/${abiFragmentsType}`;

  let hrefEventFunctionName: (
    abiFragment: FunctionAbiFragment | EventAbiFragment,
  ) => string;
  hrefEventFunctionName = (
    abiFragment: FunctionAbiFragment | EventAbiFragment,
  ): string => {
    const functionSelectorWithSplitter: string =
      getFunctionSelectorWithSplitter(abiFragment);

    const urlHash: string =
      abiFragmentsType === "functions"
        ? convertToKebabCase(TAB_VALUES_FUNCTION[0])
        : convertToKebabCase(TAB_VALUES_EVENT[0]);
    return `${hrefFrontPart}/${abiFragment.name}${functionSelectorWithSplitter}#${urlHash}`;
  };
</script>

<CommonItemMember>
  {#if abiFragments.length > 0}
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
      numOfTableRows={abiFragments.length}
      borderBottom={false}
    >
      <svelte:fragment slot="tableBody">
        {#each abiFragments as abiFragment, indexSortedEventNames}
          <BaseTableRow>
            <SequenceBodyCell
              rowIndex={indexSortedEventNames}
              {textSize}
              colorCategoryBorder={colorSettings.itemMemberTableBorder}
            />
            <BaseTableBodyCell align="left" {textSize}>
              <BaseA
                href={`${hrefEventFunctionName(abiFragment)}`}
                text={abiFragment.name}
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
{#if abiFragments.length > 0}
  <CommonViewMoreDetailsButton
    size={sizeSettings.itemViewAllButton}
    href={hrefFrontPart}
  />
{/if}
