<script lang="ts">
  import BaseItem from "./BaseItem.svelte";
  import type { Contract } from "@constants/chains/types";
  import BaseAccordion from "./BaseAccordion.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import { page } from "$app/stores";
  import { getFrontColorCategory } from "./fontStyle";
  import classNames from "classnames";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { convertToKebabCase } from "@utils/utilsCommon";
  import ItemEventsFunctions from "./ItemEventsFunctions.svelte";
  import { TAB_VALUES_CONTRACT } from "$lib/base/BasePage/BasePageContainerContent.svelte";

  export let targetContract: Contract;
  export let targetContractsHref: string;

  const size: BaseSize = sizeSettings.leftSidebarTreeMiddle;
  const sizes: {
    contractSelf: BaseSize;
    contractSuffixIcon: BaseSize;
  } = {
    contractSelf: changeSize(size, 0),
    contractSuffixIcon: changeSize(size, -1),
  };
  const targetContractHref: string = `${targetContractsHref}/${targetContract.name}`;
  const urlHash: string = convertToKebabCase(TAB_VALUES_CONTRACT[0]);
</script>

{#if !targetContract.events.abiFragments.length && !targetContract.functions.abiFragments.length}
  <BaseItem
    label={targetContract.name}
    iconName={undefined}
    hrefWithoutUrlHash={targetContractHref}
    {urlHash}
    size={sizes.contractSelf}
  />
{:else}
  <BaseAccordion
    label={targetContract.name}
    iconName={undefined}
    hrefWithoutUrlHash={targetContractHref}
    {urlHash}
    showVerticalLine
    size={sizes.contractSelf}
  >
    <svelte:fragment slot="baseAccordionSuffixIcons">
      {#if targetContract.events.abiFragments.length || targetContract.functions.abiFragments.length}
        <div class={classNames("flex", "flex-row")}>
          {#if targetContract.events.abiFragments.length}
            <BaseIcon
              name="databaseOutline"
              size={sizes.contractSuffixIcon}
              colorCategory={getFrontColorCategory(
                targetContractHref === $page.url.pathname
              )}
            />
          {/if}
          {#if targetContract.functions.abiFragments.length}
            <BaseIcon
              name="function"
              size={sizes.contractSuffixIcon}
              colorCategory={getFrontColorCategory(
                targetContractHref === $page.url.pathname
              )}
            />
          {/if}
        </div>
      {/if}
    </svelte:fragment>
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
{/if}
