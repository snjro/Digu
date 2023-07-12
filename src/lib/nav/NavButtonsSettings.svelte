<script lang="ts">
  import BaseDialog, {
    openDialog,
  } from "$lib/base/BaseDialog/BaseDialog.svelte";
  import BaseTab from "$lib/base/BaseTab.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import classNames from "classnames";
  import BaseNavButton from "./BaseNavButton.svelte";
  import RpcConfig from "./settings/rpcConfig/RpcConfig.svelte";
  import ChainExplorer from "./settings/ChainExplorer.svelte";

  let initializeValue: boolean = false;
  let dialogElement: HTMLDialogElement;
  function showDialog(): void {
    openDialog(dialogElement);
    initializeValue = true;
  }

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

<BaseNavButton
  iconName="cogOutline"
  tooltipText="settings"
  on:click={showDialog}
/>
<BaseDialog
  bind:dialogElement
  headerText="Settings"
  headerIconName="cogOutline"
  on:close={closeDialog}
>
  <BaseTab selectedTab={true} groupName="settings" slot="dialogBody">
    <div class={classNames(gridMain, "w-full", "h-full", "")}>
      <CommonItemGroup text="Chain Explorer" gridTrack={gridTrackRpc}>
        <ChainExplorer />
      </CommonItemGroup>
      <CommonItemGroup text="RPC configuration" gridTrack={gridTrackRpc}>
        <RpcConfig {initializeValue} />
      </CommonItemGroup>
    </div>
  </BaseTab>
</BaseDialog>
