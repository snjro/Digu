<script lang="ts">
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import BaseDialog, {
    openDialog,
  } from "$lib/base/BaseDialog/BaseDialog.svelte";
  import BaseHighlight from "$lib/base/BaseHighlight.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { AbiFragmentParam } from "@constants/chains/types";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
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
  colorCategoryFront={"interactive"}
  on:click={showDialog}
/>
<BaseDialog
  bind:dialogElement
  headerText={`Components of ${dialogHeaderText}`}
  headerIconName={iconName}
>
  <BaseHighlight
    slot="dialogBody"
    targetLanguageName="json"
    code={dialogText}
  />
  <!-- <pre slot="dialogBody">{dialogText}</pre> -->
</BaseDialog>
