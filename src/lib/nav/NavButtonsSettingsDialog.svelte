<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import classNames from "classnames";
  import ChainExplorer from "./settings/ChainExplorer.svelte";
  import RpcConfig from "./settings/rpcConfig/RpcConfig.svelte";
  import SyncedData from "./settings/SyncedData.svelte";
  import SyncNotice from "./settings/SyncNotice.svelte";
  import WarpSyncConfig from "./settings/WarpSyncConfig.svelte";

  interface Props {
    initializeValue: boolean;
    dialogElement: HTMLDialogElement | undefined;
  }

  let { initializeValue = $bindable(), dialogElement = $bindable() }: Props =
    $props();

  function closeDialog(): void {
    initializeValue = false;
  }
  const gridTrackRpc: string = classNames("col-span-full", "");
</script>

<BaseDialog
  bind:dialogElement
  headerText="Settings"
  headerIconName="cogOutline"
  onclose={closeDialog}
>
  {#snippet dialogBody()}
    <PageWrapperContent hasMultipleTabs={false} gridCols="grid-cols-1">
      {#snippet PageWrapperContentBody()}
        <SyncNotice />
        <CommonItemGroup text="RPC configuration" gridTrack={gridTrackRpc}>
          <RpcConfig {initializeValue} />
          <WarpSyncConfig />
        </CommonItemGroup>
        <CommonItemGroup text="Chain Explorer" gridTrack={gridTrackRpc}>
          <ChainExplorer />
        </CommonItemGroup>
        <CommonItemGroup text="Synced data" gridTrack={gridTrackRpc}>
          <SyncedData />
        </CommonItemGroup>
      {/snippet}
    </PageWrapperContent>
  {/snippet}
</BaseDialog>
