<script lang="ts">
  import { page } from "$app/stores";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type {
    Chain,
    // Contract,
    Project,
    Version,
  } from "@constants/chains/types";
  // import CommonLinkList from "$lib/common/CommonLinkList.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import BaseTable from "$lib/base/BaseTable/BaseTable.svelte";
  import BaseTableBodyCell from "$lib/base/BaseTable/BaseTableBodyCell.svelte";
  import BaseTableRow from "$lib/base/BaseTable/BaseTableRow.svelte";
  import SequenceBodyCell from "$lib/base/BaseTable/SequenceBodyCell.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonSyncStateText from "$lib/common/CommonSyncStateText.svelte";
  import CommonToggleSyncTarget from "$lib/common/CommonToggleSyncTarget.svelte";
  import CommonViewMoreDetailsButton from "$lib/common/CommonViewMoreDetailsButton.svelte";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { NO_DATA } from "@utils/utilsCostants";

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
          <BaseTableRow>
            <SequenceBodyCell
              rowIndex={indexSortedEventNames}
              {textSize}
              colorCategoryBorder={colorSettings.itemMemberTableBorder}
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
                <CommonSyncStateText
                  syncStateText={$storeSyncStatus[targetChain.name]
                    .subSyncStatuses[targetProject.name].subSyncStatuses[
                    targetVersion.name
                  ].subSyncStatuses[targetContract.name].syncStateText}
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
  <CommonViewMoreDetailsButton
    size={sizeSettings.itemViewAllButton}
    href={hrefFrontPart}
  />
{/if}
