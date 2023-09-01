<script lang="ts">
  import PageWrapperContent from "$lib/PageWrapper/PageWrapperContent.svelte";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import type {
    Chain,
    Contract,
    FunctionAbiFragment,
    Project,
    Version,
  } from "@constants/chains/types";
  import classNames from "classnames";
  import ContractOverviewBasic from "../../ContractOverviewBasic.svelte";
  import FunctionOverviewBasic from "./FunctionOverviewBasic.svelte";
  import FunctionOverviewParams from "./FunctionOverviewParams.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
  export let targetFunctionAbiFragment: FunctionAbiFragment;

  const gridTrackBasic: string = classNames("col-span-full lg:col-span-1");
  const gridTrackParams: string = classNames("col-span-full lg:col-span-1");
</script>

<PageWrapperContent gridCols="grid-cols-2">
  <svelte:fragment slot="PageWrapperContentBody">
    <CommonItemGroup text="Basic" gridTrack={gridTrackBasic}>
      <FunctionOverviewBasic {targetFunctionAbiFragment} />
    </CommonItemGroup>
    <CommonItemGroup text="Contract" gridTrack={gridTrackBasic}>
      <ContractOverviewBasic
        {targetChain}
        {targetProject}
        {targetVersion}
        {targetContract}
        activateLinkOfContractName
      />
    </CommonItemGroup>

    <CommonItemGroup text="Inputs" gridTrack={gridTrackParams}>
      <FunctionOverviewParams
        {targetFunctionAbiFragment}
        paramIdentifier="inputs"
      />
    </CommonItemGroup>
    <CommonItemGroup text="outputs" gridTrack={gridTrackParams}>
      <FunctionOverviewParams
        {targetFunctionAbiFragment}
        paramIdentifier="outputs"
      />
    </CommonItemGroup>
  </svelte:fragment>
</PageWrapperContent>
