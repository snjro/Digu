<script lang="ts">
  // import BaseButton from "$lib/base/BaseButton.svelte";
  // import { getFunctionSelectorWithSplitter } from "$lib/leftSidebar/Body/functionNameHandler";
  // import { TARGET_CHAINS } from "@constants/chains/_index";
  // import {
  //   DIR_NAME_CONTRACTS,
  //   DIR_NAME_EVENTS,
  //   DIR_NAME_FUNCTIONS,
  // } from "@utils/utilsCostants";
  import type { LoadChainData } from "./+page";
  import PageWrapper from "$lib/PageWrapper/PageWrapper.svelte";
  import ChainOverview from "./ChainOverview.svelte";

  export let data: LoadChainData;

  // function testFunc() {
  //   console.log("test");
  //   let entries = ["/"];
  //   for (const targetChain of TARGET_CHAINS) {
  //     const chainEntry = `/${targetChain.name}`;
  //     entries.push(chainEntry);
  //     for (const targetProject of targetChain.projects) {
  //       for (const targetVersion of targetProject.versions) {
  //         const projectVersionEntry =
  //           chainEntry + `/${targetProject.name}-${targetVersion.name}`;
  //         entries.push(projectVersionEntry);
  //         entries.push(projectVersionEntry + `/${DIR_NAME_CONTRACTS}`);
  //         for (const targetContract of targetVersion.contracts) {
  //           const contractEntry =
  //             projectVersionEntry +
  //             `/${DIR_NAME_CONTRACTS}/${targetContract.name}`;
  //           entries.push(contractEntry);
  //           if (targetContract.events.names.length > 0) {
  //             entries.push(contractEntry + `/${DIR_NAME_EVENTS}`);
  //           }
  //           for (const eventName of targetContract.events.names) {
  //             const eventEntry =
  //               contractEntry + `/${DIR_NAME_EVENTS}/${eventName}`;
  //             entries.push(eventEntry);
  //           }
  //           if (targetContract.functions.names.length > 0) {
  //             entries.push(contractEntry + `/${DIR_NAME_FUNCTIONS}`);
  //           }
  //           for (const functionAbiFragment of targetContract.functions
  //             .abiFragments) {
  //             const functionEntry =
  //               contractEntry +
  //               `/${DIR_NAME_FUNCTIONS}/${functionAbiFragment.name}` +
  //               getFunctionSelectorWithSplitter(functionAbiFragment);
  //             entries.push(functionEntry);
  //           }
  //         }
  //       }
  //     }
  //   }
  //   console.log(entries);
  // }
  const titleCategoryLabelText: string = "Chain";
</script>

<PageWrapper
  titleProps={{
    titleText: data.targetChain.fullName,
    titleCategoryLabelText: titleCategoryLabelText,
  }}
>
  <svelte:fragment slot="PageWrapperContent">
    <ChainOverview targetChain={data.targetChain}></ChainOverview>
  </svelte:fragment>
</PageWrapper>

<!-- <BaseButton
  label="test Btn"
  on:click={testFunc}
  border
  colorCategoryFront="interactive"
/> -->
