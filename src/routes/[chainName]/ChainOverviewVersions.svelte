<script lang="ts">
  import { page } from "$app/stores";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type {
    Chain,
    Contract,
    Project,
    Version,
  } from "@constants/chains/types";
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
  import { trailingSlash } from "@routes/+layout";
  import { storeSyncStatus } from "@stores/storeSyncStatus";
  import { DIR_NAME_CONTRACTS, NO_DATA } from "@utils/utilsCostants";
  import BaseProgressBarForBlockNumber from "$lib/base/BaseProgressBarForBlockNumber/BaseProgressBarForBlockNumber.svelte";
  import { storeChainStatus } from "@stores/storeChainStatus";
  import type { SyncStatusProject } from "@db/dbTypes";
  import { getProjectVersionNameForUrl } from "./[projectName_versionName]/projectVersionNameHelper";

  // export let contracts: Contract[];
  export let targetChain: Chain;
  export let targetProject: Project;

  const textSize: BaseSize = sizeSettings.itemMemberTable;
  const warnningTextSize: BaseSize = sizeSettings.itemWarnningMessage;
  // const hrefFrontPart: string =
  //   trailingSlash === "always"
  //     ? `${$page.url.pathname}`
  //     : `${$page.url.pathname}/`;
  $: hrefFrontPart = (targetVersion: Version): string => {
    const pageUrlPathname: string =
      trailingSlash === "always"
        ? `${$page.url.pathname}`
        : `${$page.url.pathname}/`;

    return `${pageUrlPathname}${getProjectVersionNameForUrl(
      targetProject.name,
      targetVersion.name,
    )}`;
  };

  const noListMessage: string = `No versions.`;
  const numberOfEventsInVersion = (targetVersion: Version): number => {
    let numOfEvents: number = 0;
    targetVersion.contracts.forEach((targetContract: Contract) => {
      numOfEvents += targetContract.events.abiFragments.length;
    });
    return numOfEvents;
  };
  const hasVersionEvents = (targetVersion: Version): boolean => {
    return numberOfEventsInVersion(targetVersion) > 0;
  };
  let targetProjectSyncStatus: SyncStatusProject;
  $: targetProjectSyncStatus =
    $storeSyncStatus[targetChain.name].subSyncStatuses[targetProject.name];
</script>

<CommonItemMember>
  {#if targetProject.versions.length > 0}
    <BaseTable
      tableHeaderCellProps={[
        {
          text: `Version Name`,
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
        {
          text: `Progress`,
          align: "center",
          textSize: textSize,
          width: "w-full",
        },
        {
          text: `Contracts`,
          align: "center",
          textSize: textSize,
          width: "w-full",
        },
      ]}
      {textSize}
      numOfTableRows={targetProject.versions.length}
      borderBottom={false}
    >
      <svelte:fragment slot="tableBody">
        {#each targetProject.versions as targetVersion, rowIndex}
          <BaseTableRow>
            <SequenceBodyCell
              {rowIndex}
              {textSize}
              colorCategoryBorder={colorSettings.itemMemberTableBorder}
            />
            <BaseTableBodyCell align="left" {textSize}>
              <BaseA
                href={hrefFrontPart(targetVersion)}
                text={targetVersion.name}
                {textSize}
                openNewTab={false}
              />
            </BaseTableBodyCell>
            <BaseTableBodyCell
              align={hasVersionEvents(targetVersion) ? "left" : "center"}
              {textSize}
            >
              {#if hasVersionEvents(targetVersion)}
                <CommonToggleSyncTarget
                  {targetChain}
                  {targetProject}
                  {targetVersion}
                  size={changeSize(textSize, -1)}
                />
              {:else}
                <BaseLabel text={NO_DATA} {textSize} />
              {/if}
            </BaseTableBodyCell>
            <BaseTableBodyCell
              align={hasVersionEvents(targetVersion) ? "left" : "center"}
              {textSize}
            >
              {#if hasVersionEvents(targetVersion)}
                <CommonSyncStateText
                  syncStateText={targetProjectSyncStatus.subSyncStatuses[
                    targetVersion.name
                  ].syncStateText}
                  size={changeSize(textSize, -1)}
                  colorCategoryFront={colorSettings.itemMemberText}
                />
              {:else}
                <BaseLabel text={NO_DATA} {textSize} />
              {/if}
            </BaseTableBodyCell>
            <BaseTableBodyCell
              align={hasVersionEvents(targetVersion) ? "left" : "center"}
              {textSize}
            >
              {#if hasVersionEvents(targetVersion)}
                <BaseProgressBarForBlockNumber
                  startBlockNumber={targetProjectSyncStatus.subSyncStatuses[
                    targetVersion.name
                  ].creationBlockNumber}
                  colorCategoryFront={colorSettings.gridContainer}
                  colorCategoryBg={colorSettings.gridContainer}
                  fetchedBlockNumber={targetProjectSyncStatus.subSyncStatuses[
                    targetVersion.name
                  ].fetchedBlockNumber}
                  endBlockNumber={$storeChainStatus[targetChain.name]
                    .latestBlockNumber}
                  size={changeSize(textSize, -1)}
                  showBlockNumber={false}
                  shadowBar={false}
                  processing={targetProjectSyncStatus.subSyncStatuses[
                    targetVersion.name
                  ].isSyncing}
                  rounded
                />
              {:else}
                <BaseLabel text={NO_DATA} {textSize} />
              {/if}
            </BaseTableBodyCell>

            <BaseTableBodyCell
              align={hasVersionEvents(targetVersion) ? "right" : "center"}
              {textSize}
            >
              {#if hasVersionEvents(targetVersion)}
                <BaseA
                  href={`${hrefFrontPart(targetVersion)}/${DIR_NAME_CONTRACTS}`}
                  text={numberOfEventsInVersion(targetVersion).toString()}
                  {textSize}
                  openNewTab={false}
                />
              {:else}
                <BaseLabel text={NO_DATA} {textSize} />
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
