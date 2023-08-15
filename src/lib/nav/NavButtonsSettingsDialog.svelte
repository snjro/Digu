<script lang="ts">
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import classNames from "classnames";
  import RpcConfig from "./settings/rpcConfig/RpcConfig.svelte";
  import ChainExplorer from "./settings/ChainExplorer.svelte";

  export let initializeValue: boolean;
  export let dialogElement: HTMLDialogElement;

  function closeDialog(): void {
    initializeValue = false;
  }
  const gridMain: string = classNames(
    "grid",
    "grid-cols-6",
    "grid-flow-dense",
    "gap-3"
  );
  const gridTrackRpc: string = classNames("col-span-full", "");
</script>

<BaseDialog
  bind:dialogElement
  headerText="Settings"
  headerIconName="cogOutline"
  on:close={closeDialog}
>
  <div class={classNames(gridMain, "w-full", "h-full", "")} slot="dialogBody">
    <CommonItemGroup text="RPC configuration" gridTrack={gridTrackRpc}>
      <RpcConfig {initializeValue} />
    </CommonItemGroup>
    <CommonItemGroup text="Chain Explorer" gridTrack={gridTrackRpc}>
      <ChainExplorer />
    </CommonItemGroup>
  </div>
</BaseDialog>
