<script lang="ts">
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import classNames from "classnames";
  import RpcConfig from "./settings/rpcConfig/RpcConfig.svelte";
  import ChainExplorer from "./settings/ChainExplorer.svelte";
  import BasePageContainerContent from "$lib/base/BasePage/BasePageContainerContent.svelte";
  import CommonOverviewFrame from "$lib/common/CommonOverviewFrame.svelte";

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
  <BasePageContainerContent tabState={undefined} slot="dialogBody">
    <CommonOverviewFrame gridCols={1}>
      <CommonItemGroup text="RPC configuration" gridTrack={gridTrackRpc}>
        <RpcConfig {initializeValue} />
      </CommonItemGroup>
      <CommonItemGroup text="Chain Explorer" gridTrack={gridTrackRpc}>
        <ChainExplorer />
      </CommonItemGroup>
    </CommonOverviewFrame>
  </BasePageContainerContent>
</BaseDialog>
