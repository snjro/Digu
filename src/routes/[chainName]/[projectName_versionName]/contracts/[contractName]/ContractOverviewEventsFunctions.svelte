<script lang="ts">
  import { page } from "$app/state";
  import { getFirstTabUrlHash } from "#lib/PageWrapper/tabs.js";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseA from "#lib/base/BaseA.svelte";
  import type { BaseIconProps } from "#lib/base/BaseIcon.js";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import BaseTable from "#lib/base/BaseTable/BaseTable.svelte";
  import BaseTableBodyCell from "#lib/base/BaseTable/BaseTableBodyCell.svelte";
  import BaseTableRow from "#lib/base/BaseTable/BaseTableRow.svelte";
  import SequenceBodyCell from "#lib/base/BaseTable/SequenceBodyCell.svelte";
  import type { BaseSize } from "#lib/base/baseSizes.js";
  import CommonItemMember from "#lib/common/CommonItemMember.svelte";
  import CommonViewMoreDetailsButton from "#lib/common/CommonViewMoreDetailsButton.svelte";
  import { getAbiFragmentHref } from "#lib/leftSidebar/Body/functionNameHandler.js";
  import { getSubdirectoryHref } from "#lib/common/linkHref.js";
  import type {
    Contract,
    EventAbiFragment,
    FunctionAbiFragment,
  } from "#constants/chains/types.js";
  import { trailingSlash } from "#routes/+layout.js";
  import type { AbiFragmentsType } from "#lib/contracts/abiFragmentsType.js";
  import { capitalizeFirstLetter } from "#utils/utilsCommon.js";

  interface Props {
    abiFragmentsType: AbiFragmentsType;
    targetContract: Contract;
  }

  let { abiFragmentsType, targetContract }: Props = $props();

  const textSize: BaseSize = sizeSettings.itemMemberTable;
  const iconName: BaseIconProps["name"] = $derived(
    abiFragmentsType === "events" ? "databaseOutline" : "function",
  );

  let abiFragments: FunctionAbiFragment[] | EventAbiFragment[] = $derived(
    targetContract[abiFragmentsType].abiFragments,
  );

  const singularListType: string = $derived(abiFragmentsType.slice(0, -1));
  const headerLabel: string = $derived(
    `${capitalizeFirstLetter(singularListType)} Name`,
  );
  let hrefFrontPart = $derived(
    getSubdirectoryHref(page.url.pathname, trailingSlash, abiFragmentsType),
  );

  const hrefEventFunctionName = (
    abiFragment: FunctionAbiFragment | EventAbiFragment,
  ): string =>
    `${getAbiFragmentHref(hrefFrontPart, abiFragment)}#${getFirstTabUrlHash(abiFragmentsType)}`;
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
      {#snippet tableBody()}
        {#each abiFragments as abiFragment, indexSortedEventNames (abiFragment)}
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
      {/snippet}
    </BaseTable>
  {:else}
    <BaseLabel
      text={`The contract has no ${abiFragmentsType}.`}
      textSize={sizeSettings.itemWarningMessage}
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
