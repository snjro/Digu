<script lang="ts">
  import { convertTabValueForHref } from "$lib/PageWrapper/tabs";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import CommonItemMember from "$lib/common/CommonItemMember.svelte";
  import CommonViewMoreDetailsButton from "$lib/common/CommonViewMoreDetailsButton.svelte";
  import type {
    Chain,
    Contract,
    EventAbiFragment,
    Project,
    Version,
  } from "@constants/chains/types";
  import { dbWorkerFuncGetConvertedEventLogs } from "@db/db.worker.func.getConvertedEventLogs";
  import type { ConvertedEventLog } from "@db/dbTypes";
  import { numberWithCommas } from "@utils/utilsCommon";
  import classNames from "classnames";
  import EventOverviewFetchedLogsEdge from "./EventOverviewFetchedLogsEdge.svelte";
  import { MESSAGE_ANONYMOUS_EVENT_LOGS } from "./EventLogs.svelte";

  interface Props {
    targetChain: Chain;
    targetProject: Project;
    targetVersion: Version;
    targetContract: Contract;
    targetEventAbiFragment: EventAbiFragment;
  }

  let {
    targetChain,
    targetProject,
    targetVersion,
    targetContract,
    targetEventAbiFragment,
  }: Props = $props();

  let convertedEventLogs: ConvertedEventLog[] = $state.raw([]);
  const eventLogsFetcherFromDB = async (
    targetChainName: Chain["name"],
    targetProjectName: Project["name"],
    targetVersionName: Version["name"],
    targetContractName: Contract["name"],
    targetEventAbiFragmentName: EventAbiFragment["name"],
  ): Promise<void> => {
    // Logs of anonymous events are not fetched, so their table does not exist.
    if (targetEventAbiFragment.anonymous) {
      convertedEventLogs = [];
      return;
    }
    convertedEventLogs = await dbWorkerFuncGetConvertedEventLogs({
      chainName: targetChainName,
      projectName: targetProjectName,
      versionName: targetVersionName,
      contractName: targetContractName,
      abiFragmentName: targetEventAbiFragmentName,
    });
  };
  $effect.pre(() => {
    eventLogsFetcherFromDB(
      targetChain.name,
      targetProject.name,
      targetVersion.name,
      targetContract.name,
      targetEventAbiFragment.name,
    );
  });

  const gridMain: string = classNames(
    "grid",
    "grid-cols-1 lg:grid-cols-2",
    "grid-flow-dense",
    "gap-5",
  );
</script>

{#if targetEventAbiFragment.anonymous}
  <BaseLabel
    text={MESSAGE_ANONYMOUS_EVENT_LOGS}
    italic
    textSize={sizeSettings.itemWarnningMessage}
  />
{:else if convertedEventLogs.length > 0}
  <CommonItemMember text="Number of Fetched Logs">
    <BaseLabel
      text={numberWithCommas(convertedEventLogs.length)}
      textSize={sizeSettings.itemMember}
    />
  </CommonItemMember>
  <div class={classNames(gridMain, "w-full", "h-fit")}>
    <CommonItemMember text="Latest Log">
      <EventOverviewFetchedLogsEdge {convertedEventLogs} edgeType="latest" />
    </CommonItemMember>
    <CommonItemMember text="Oldest Log">
      <EventOverviewFetchedLogsEdge {convertedEventLogs} edgeType="oldest" />
    </CommonItemMember>
  </div>
  <CommonViewMoreDetailsButton
    label="View all Event Logs"
    size={sizeSettings.itemViewAllButton}
    href={convertTabValueForHref("Event Logs (text)")}
  />
{:else}
  <BaseLabel
    text="No logs fetched yet."
    italic
    textSize={sizeSettings.itemWarnningMessage}
  />
{/if}
