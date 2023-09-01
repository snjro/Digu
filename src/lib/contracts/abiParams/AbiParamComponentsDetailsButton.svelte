<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import BaseDialog, {
    openDialog,
  } from "$lib/base/BaseDialog/BaseDialog.svelte";
  import BaseHighlight from "$lib/base/BaseHighlight.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { AbiFragmentParam } from "@constants/chains/types";
  import { jsonStringifyFormatted } from "@utils/utilsCommon";

  export let dialogHeaderText: string;
  export let components: readonly AbiFragmentParam[];

  const iconName: BaseIconProps["name"] = "loupe";
  let dialogElement: HTMLDialogElement;
  function showDialog() {
    openDialog(dialogElement);
  }
  $: dialogText = jsonStringifyFormatted(components);
</script>

<BaseButtonIcon
  {iconName}
  size={sizeSettings.abiParamsTable}
  label="View"
  noPadding
  shadowEffect={false}
  prefixIcon
  popupEffect={false}
  colorCategoryFront={"interactive"}
  on:click={showDialog}
/>
<BaseDialog
  bind:dialogElement
  headerText={`Components of ${dialogHeaderText}`}
  headerIconName={undefined}
>
  <PageWrapperContent hasMultipulTabs={false} slot="dialogBody">
    <svelte:fragment slot="PageWrapperContentBody">
      <BaseHighlight targetLanguageName="json" code={dialogText} />
    </svelte:fragment>
  </PageWrapperContent>
</BaseDialog>
