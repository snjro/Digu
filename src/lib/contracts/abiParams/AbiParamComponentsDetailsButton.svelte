<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseButtonIcon from "$lib/base/BaseButtonIcon.svelte";
  import BaseDialog from "$lib/base/BaseDialog/BaseDialog.svelte";
  import { openDialog } from "$lib/base/BaseDialog/BaseDialogHandler";
  import BaseHighlight from "$lib/base/BaseHighlight.svelte";
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import type { AbiFragmentParam } from "@constants/chains/types";
  import { jsonStringifyFormatted } from "@utils/utilsCommon";

  interface Props {
    dialogHeaderText: string;
    components: readonly AbiFragmentParam[];
  }

  let { dialogHeaderText, components }: Props = $props();

  const iconName: BaseIconProps["name"] = "loupe";
  let dialogElement = $state() as HTMLDialogElement;
  function showDialog() {
    openDialog(dialogElement);
  }
  let dialogText = $derived(jsonStringifyFormatted(components));
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
  onclick={showDialog}
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
