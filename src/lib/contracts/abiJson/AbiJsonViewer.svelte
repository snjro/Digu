<script lang="ts" context="module">
  export type TargetAbi =
    | ContractInterface
    | EventAbiFragment
    | FunctionAbiFragment;
  export function isTargetContractInterface(
    targetAbi: TargetAbi
  ): targetAbi is ContractInterface {
    return targetAbi.hasOwnProperty("fragments");
  }
</script>

<script lang="ts">
  import type {
    ContractInterface,
    EventAbiFragment,
    FunctionAbiFragment,
  } from "@constants/chains/types";

  import BasePageItemsContainer from "$lib/base/BasePage/BasePageItemsContainer.svelte";
  import AbiJsonViewerFunctionBar from "./AbiJsonViewrFunctionBar.svelte";
  import BaseHighlight from "$lib/base/BaseHighlight.svelte";
  import type { AbiFormatType } from "@utils/utilsEthers";
  import { jsonStringifyFormatted } from "@utils/utilsCommon";

  export let targetAbi: TargetAbi;
  export let abiFormatType: AbiFormatType;
  export let hidden: boolean;
  export let titleCategoryLabelText: string;
  export let titleText: string;

  let formattedAbi: string[] | string;
  $: {
    if (isTargetContractInterface(targetAbi)) {
      if (abiFormatType === "json") {
        formattedAbi = targetAbi.formatJson();
      } else {
        formattedAbi = targetAbi.format(abiFormatType === "minimal");
      }
    } else {
      if (abiFormatType === "json") {
        formattedAbi = targetAbi.format(abiFormatType);
      } else {
        formattedAbi = [targetAbi.format(abiFormatType)];
      }
    }
  }
  $: abiText = isExpanded
    ? jsonStringifyFormatted(formattedAbi)
    : formattedAbi.toString();

  let isExpanded: boolean = true;
  let isFullScreen: boolean = false;
</script>

<BasePageItemsContainer {hidden} {isFullScreen}>
  <AbiJsonViewerFunctionBar
    bind:isExpanded
    bind:isFullScreen
    {abiText}
    {titleCategoryLabelText}
    {titleText}
  />
  <BaseHighlight code={abiText} targetLanguageName="json" />
</BasePageItemsContainer>
