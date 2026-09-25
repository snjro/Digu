<script lang="ts">
  import { page } from "$app/state";
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
  import { getContractHref, getSubdirectoryHref } from "$lib/common/linkHref";
  import { trailingSlash } from "@routes/+layout";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { DIR_NAME_CONTRACTS, NO_DATA } from "@utils/utilsCostants";
  import { hasSyncTargetEvents } from "@utils/utilsEthers";

  interface Props {
    // export let contracts: Contract[];
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
  }

  let { targetChain, targetProject, targetVersion }: Props = $props();

  const textSize: BaseSize = sizeSettings.itemMemberTable;
  const warnningTextSize: BaseSize = sizeSettings.itemWarnningMessage;
  const hrefFrontPart: string = $derived(
    getSubdirectoryHref(page.url.pathname, trailingSlash, DIR_NAME_CONTRACTS),
  );
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
      {#snippet tableBody()}
        {#each targetVersion.contracts as targetContract, indexSortedEventNames}
          <BaseTableRow>
            <SequenceBodyCell
              rowIndex={indexSortedEventNames}
              {textSize}
              colorCategoryBorder={colorSettings.itemMemberTableBorder}
            />
            <BaseTableBodyCell align="left" {textSize}>
              <BaseA
                href={getContractHref(hrefFrontPart, targetContract.name)}
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
              align={hasSyncTargetEvents(targetContract) ? "left" : "center"}
              {textSize}
            >
              {#if hasSyncTargetEvents(targetContract)}
                <CommonToggleSyncTarget
                  {targetChain}
                  {targetProject}
                  {targetVersion}
                  {targetContract}
                  size={changeSize(textSize, -1)}
                />
              {:else}
                <BaseLabel text={NO_DATA} {textSize} />
              {/if}
            </BaseTableBodyCell>
            <BaseTableBodyCell
              align={hasSyncTargetEvents(targetContract) ? "left" : "center"}
              {textSize}
            >
              {#if hasSyncTargetEvents(targetContract)}
                <CommonSyncStateText
                  syncStateText={$storeSyncStatus[targetChain.name]
                    .subSyncStatuses[targetProject.name].subSyncStatuses[
                    targetVersion.name
                  ].subSyncStatuses[targetContract.name].syncStateText}
                  size={changeSize(textSize, -1)}
                  colorCategoryFront={colorSettings.itemMemberText}
                />
              {:else}
                <BaseLabel text={NO_DATA} {textSize} />
              {/if}
            </BaseTableBodyCell>
          </BaseTableRow>
        {/each}
      {/snippet}
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
