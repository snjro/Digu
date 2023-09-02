<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButton from "$lib/base/BaseButton.svelte";
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import { openDialog } from "$lib/base/BaseDialog/BaseDialogHandler";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import AbiParamsTable, {
    type CommonAbiParamsTableProps,
  } from "./AbiParamsTable.svelte";

  export let paramTypes: CommonAbiParamsTableProps["paramTypes"];
  export let dialogHeaderText: string;
  export let showAbiParamsInputIndexedField: boolean = false;

  const textSize: BaseSize = sizeSettings.abiParamsTable;

  let dialogElement: HTMLDialogElement;
  function showDialog() {
    openDialog(dialogElement);
  }
</script>

{#if paramTypes.length > 0}
  <BaseButton
    size={textSize}
    label={paramTypes.length.toString()}
    noPadding
    hoverEffect={false}
    shadowEffect={false}
    colorCategoryFront="interactive"
    on:click={showDialog}
  />
  <BaseDialog
    bind:dialogElement
    headerText={`${dialogHeaderText}`}
    headerIconName={undefined}
  >
    <PageWrapperContent hasMultipulTabs={false} slot="dialogBody">
      <svelte:fragment slot="PageWrapperContentBody">
        <AbiParamsTable
          {paramTypes}
          {dialogHeaderText}
          showInputIndexedField={showAbiParamsInputIndexedField}
        />
      </svelte:fragment>
    </PageWrapperContent>
  </BaseDialog>
{:else}
  <BaseLabel
    text={paramTypes.length.toString()}
    {textSize}
    colorCategoryFront={colorSettings.gridCell}
  />
{/if}
