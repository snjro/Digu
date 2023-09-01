<script lang="ts">
  import { TAB_VALUES_CONTRACT } from "$lib/PageWrapper/PageWrapper.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import type { Contract } from "@constants/chains/types";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import BaseAccordion from "./BaseAccordion.svelte";
  import type { BaseAccordionHeaderSuffixIcon } from "./BaseAccordionHeaderSuffixIcons.svelte";
  import BaseItem from "./BaseItem.svelte";
  import ItemEventsFunctions from "./ItemEventsFunctions.svelte";

  export let targetContract: Contract;
  export let targetContractsHref: string;

  const size: BaseSize = sizeSettings.leftSidebarTree2nd;
  const sizes: {
    contractSelf: BaseSize;
    contractSuffixIcon: BaseSize;
  } = {
    contractSelf: changeSize(size, 0),
    contractSuffixIcon: changeSize(size, -1),
  };
  const targetContractHref: string = `${targetContractsHref}/${targetContract.name}`;
  const urlHash: string = convertToKebabCase(TAB_VALUES_CONTRACT[0]);
  const hasEvents: boolean = targetContract.events.abiFragments.length > 0;
  const hasFunctions: boolean =
    targetContract.functions.abiFragments.length > 0;
  const hasChildren: boolean = hasEvents || hasFunctions;

  const suffixIcons = (): BaseAccordionHeaderSuffixIcon[] => {
    let icons: BaseAccordionHeaderSuffixIcon[] = [];
    if (hasEvents) {
      icons.push({
        name: "databaseOutline",
        size: sizes.contractSuffixIcon,
      });
    }
    if (hasFunctions) {
      icons.push({
        name: "function",
        size: sizes.contractSuffixIcon,
      });
    }
    return icons;
  };
</script>

{#if hasChildren}
  <BaseAccordion
    label={targetContract.name}
    iconName={undefined}
    hrefWithoutUrlHash={targetContractHref}
    {urlHash}
    size={sizes.contractSelf}
    suffixIcons={suffixIcons()}
  >
    <svelte:fragment slot="baseAccordionChildren">
      <ItemEventsFunctions
        targetAbiFragments={targetContract.events.abiFragments}
        abiFragmentsType="events"
        {targetContractHref}
      />
      <ItemEventsFunctions
        targetAbiFragments={targetContract.functions.abiFragments}
        abiFragmentsType="functions"
        {targetContractHref}
      />
    </svelte:fragment>
  </BaseAccordion>
{:else}
  <BaseItem
    label={targetContract.name}
    hrefWithoutUrlHash={targetContractHref}
    {urlHash}
    size={sizes.contractSelf}
    {hasChildren}
  />
{/if}
