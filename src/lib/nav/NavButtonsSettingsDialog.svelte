<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import classNames from "classnames";
  import SyncedData from "./settings/SyncedData.svelte";
  import SyncNotice from "./settings/SyncNotice.svelte";
  import WarpSyncConfig from "./settings/WarpSyncConfig.svelte";

  interface Props {
    dialogElement: HTMLDialogElement | undefined;
  }

  let { dialogElement = $bindable() }: Props = $props();

  const gridTrack: string = classNames("col-span-full", "");
</script>

<BaseDialog
  bind:dialogElement
  headerText="Settings"
  headerIconName="cogOutline"
>
  {#snippet dialogBody()}
    <PageWrapperContent hasMultipleTabs={false} gridCols="grid-cols-1">
      {#snippet PageWrapperContentBody()}
        <SyncNotice />
        <CommonItemGroup text="Synced data" gridTrack={gridTrack}>
          <WarpSyncConfig />
          <SyncedData />
        </CommonItemGroup>
      {/snippet}
    </PageWrapperContent>
  {/snippet}
</BaseDialog>
