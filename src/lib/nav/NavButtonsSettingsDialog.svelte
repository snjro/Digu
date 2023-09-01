<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import classNames from "classnames";
  import ChainExplorer from "./settings/ChainExplorer.svelte";
  import RpcConfig from "./settings/rpcConfig/RpcConfig.svelte";

  export let initializeValue: boolean;
  export let dialogElement: HTMLDialogElement;

  function closeDialog(): void {
    initializeValue = false;
  }
  const gridTrackRpc: string = classNames("col-span-full", "");
</script>

<BaseDialog
  bind:dialogElement
  headerText="Settings"
  headerIconName="cogOutline"
  on:close={closeDialog}
>
  <PageWrapperContent
    hasMultipulTabs={false}
    gridCols="grid-cols-1"
    slot="dialogBody"
  >
    <svelte:fragment slot="PageWrapperContentBody">
      <CommonItemGroup text="RPC configuration" gridTrack={gridTrackRpc}>
        <RpcConfig {initializeValue} />
      </CommonItemGroup>
      <CommonItemGroup text="Chain Explorer" gridTrack={gridTrackRpc}>
        <ChainExplorer />
      </CommonItemGroup>
    </svelte:fragment>
  </PageWrapperContent>
</BaseDialog>
