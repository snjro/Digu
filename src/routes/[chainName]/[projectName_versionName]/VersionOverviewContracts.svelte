<script lang="ts">
  import type {
    Chain,
    // Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import { page } from "$app/stores";
  // import CommonLinkList from "$lib/common/CommonLinkList.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import BaseTable from "$lib/base/BaseTable/BaseTable.svelte";
  import BaseTableRow from "$lib/base/BaseTable/BaseTableRow.svelte";
  import SequenceBodyCell from "$lib/base/BaseTable/SequenceBodyCell.svelte";
  import BaseTableBodyCell from "$lib/base/BaseTable/BaseTableBodyCell.svelte";
  import BaseA from "$lib/base/BaseA.svelte";
  import classNames from "classnames";
  import CommonToggleSyncTarget from "$lib/common/CommonToggleSyncTarget.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { NO_DATA } from "@utils/utilsCostants";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import CommonSyncCurrentState from "$lib/common/CommonSyncCurrentState.svelte";
  import CommonViewMoreDetailsButton from "$lib/common/CommonViewMoreDetailsButton.svelte";

  // export let contracts: Contract[];
  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;

  const textSize: BaseSize = sizeSettings.itemMemberTable;
  const warnningTextSize: BaseSize = sizeSettings.itemWarnningMessage;
  const hrefFrontPart: string = `${$page.url.pathname}/contracts`;
  const noListMessage: string = `No contracts.`;
</script>

<CommonItemMember>
  {#if targetVersion.contracts.length > 0}
    <BaseTable
      tableHeaderCellProps={[
        {
          text: `Contract Name`,
          align: "center",
          textSize: textSize,
          width: "w-full",
        },
        {
          text: `Sync Target`,
          align: "center",
          textSize: textSize,
          width: "w-full",
        },
        {
          text: `Sync State`,
          align: "center",
          textSize: textSize,
          width: "w-full",
        },
      ]}
      {textSize}
      numOfTableRows={targetVersion.contracts.length}
      borderBottom={false}
    >
      <svelte:fragment slot="tableBody">
        {#each targetVersion.contracts as targetContract, indexSortedEventNames}
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
                href={`${hrefFrontPart}/${targetContract.name}`}
                text={targetContract.name}
                prefixIcon={{
                  name: "scriptText",
                  colorCategory: "interactive",
                }}
                {textSize}
                openNewTab={false}
              />
            </BaseTableBodyCell>
            <BaseTableBodyCell
              align={targetContract.events.abiFragments.length > 0
                ? "left"
                : "center"}
              {textSize}
            >
              {#if targetContract.events.abiFragments.length > 0}
                <CommonToggleSyncTarget
                  {targetChain}
                  {targetProject}
                  {targetVersion}
                  {targetContract}
                  size={changeSize(textSize, -1)}
                />
              {:else}
                <BaseLabel text={NO_DATA} />
              {/if}
            </BaseTableBodyCell>
            <BaseTableBodyCell
              align={targetContract.events.abiFragments.length > 0
                ? "left"
                : "center"}
              {textSize}
            >
              {#if targetContract.events.abiFragments.length > 0}
                <CommonSyncCurrentState
                  {targetChain}
                  {targetProject}
                  {targetVersion}
                  {targetContract}
                  size={changeSize(textSize, -1)}
                  colorCategoryFront={colorSettings.itemMemberText}
                />
              {:else}
                <BaseLabel text={NO_DATA} />
              {/if}
            </BaseTableBodyCell>
          </BaseTableRow>
        {/each}
      </svelte:fragment>
    </BaseTable>
  {:else}
    <BaseLabel text={noListMessage} textSize={warnningTextSize} italic />
  {/if}
</CommonItemMember>
{#if targetVersion.contracts.length > 0}
  <div class={classNames("h-full", "flex", "items-end", "justify-end")}>
    <CommonViewMoreDetailsButton
      size={sizeSettings.itemViewAllButton}
      href={hrefFrontPart}
    />
  </div>
{/if}
