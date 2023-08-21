<script lang="ts">
  import classNames from "classnames";
  import type {
    Chain,
    Project,
    Version,
    Contract,
    FunctionAbiFragment,
  } from "@constants/chains/types";
  import CommonItemGroup from "$lib/common/CommonItemGroup.svelte";
  import FunctionOverviewBasic from "./FunctionOverviewBasic.svelte";
  import FunctionOverviewParams from "./FunctionOverviewParams.svelte";
  import ContractOverviewBasic from "../../ContractOverviewBasic.svelte";
  import CommonOverviewFrame from "$lib/common/CommonOverviewFrame.svelte";

  export let targetChain: Chain;
  export let targetProject: Project;
  export let targetVersion: Version;
  export let targetContract: Contract;
  export let targetFunctionAbiFragment: FunctionAbiFragment;
  export let hidden: boolean;

  const gridTrackBasic: string = classNames("col-span-full lg:col-span-1");
  const gridTrackParams: string = classNames("col-span-full lg:col-span-1");
</script>

<CommonOverviewFrame gridCols={2} {hidden}>
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
</CommonOverviewFrame>
