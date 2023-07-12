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

  export let targetContractHref: string;
  export let targetContractName: Contract["name"];
  export let hasEvents: boolean;
  export let hasFunctions: boolean;
  const size: BaseSize = sizeSettings.leftSidebarTreeMiddle;

  const sizes: {
    contractSelf: BaseSize;
    contractSuffixIcon: BaseSize;
    contractChildren: BaseSize;
  } = {
    contractSelf: changeSize(size, 0),
    contractSuffixIcon: changeSize(size, -1),
    contractChildren: changeSize(size, -1),
  };
  const hrefs: { events: string; functions: string } = {
    events: `${targetContractHref}/events`,
    functions: `${targetContractHref}/functions`,
  };
  $: isSelectedContract = (): boolean => {
    return targetContractHref === $page.url.pathname;
  };
  // $: isSelectedEvents = (): boolean => {
  //   return hrefs.events === $page.url.pathname;
  // };
  // $: isSelectedFunctions = (): boolean => {
  //   return hrefs.functions === $page.url.pathname;
  // };
</script>

{#if !hasEvents && !hasFunctions}
  <BaseItem
    label={targetContractName}
    iconName={undefined}
    href={targetContractHref}
    size={sizes.contractSelf}
  />
{:else}
  <BaseAccordion
    label={targetContractName}
    iconName={undefined}
    href={targetContractHref}
    showVerticalLine
    size={sizes.contractSelf}
  >
    <svelte:fragment slot="baseAccordionSuffixIcons">
      {#if hasEvents || hasFunctions}
        <div class={classNames("flex", "flex-row")}>
          {#if hasEvents}
            <BaseIcon
              name="databaseOutline"
              size={sizes.contractSuffixIcon}
              colorCategory={getFrontColorCategory(isSelectedContract())}
            />
          {/if}
          {#if hasFunctions}
            <BaseIcon
              name="function"
              size={sizes.contractSuffixIcon}
              colorCategory={getFrontColorCategory(isSelectedContract())}
            />
          {/if}
        </div>
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="baseAccordionChildren">
      {#if hasEvents}
        <BaseItem
          iconName={"databaseOutline"}
          label={"Events"}
          size={sizes.contractChildren}
          href={hrefs.events}
          isConsideredAsParentDirectory={true}
        />
      {/if}
      {#if hasFunctions}
        <BaseItem
          iconName={"function"}
          label={"Functions"}
          size={sizes.contractChildren}
          href={hrefs.functions}
          isConsideredAsParentDirectory={true}
        />
      {/if}
    </svelte:fragment>
  </BaseAccordion>
{/if}
