<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import type { ConvertedEventLog } from "@db/dbTypes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { convertJsDateToIso8601 } from "@utils/utilsTime";
  import classNames from "classnames";

  export let convertedEventLogs: ConvertedEventLog[];
  export let edgeType: "latest" | "oldest";

  const textSize: BaseSize = sizeSettings.itemMember;
  $: edgeEventLog = (): ConvertedEventLog => {
    if (edgeType === "latest") {
      return convertedEventLogs[convertedEventLogs.length - 1];
    } else {
      return convertedEventLogs[0];
    }
  };

  const itemStyle: string = classNames(
    "flex",
    "flex-row",
    "items-start",
    "w-full",
    "pl-1",
    ""
  );
  const subItemStyle: string = classNames("w-32", "flex-none");
</script>

<div class={itemStyle}>
  <div class={classNames(subItemStyle)}>
    <BaseLabel text="Block Number" {textSize} />
  </div>

  <CommonChainExplorerLink
    subdirectory="block"
    value={edgeEventLog().blockNumber.toString()}
    isFontMono
    {textSize}
  />
</div>
<div class={itemStyle}>
  <div class={classNames(subItemStyle)}>
    <BaseLabel text="Datetime" {textSize} />
  </div>
  <BaseLabel
    text={edgeEventLog
      ? convertJsDateToIso8601(edgeEventLog().jsDate)
      : undefined}
    fontMono
    {textSize}
  />
</div>
<div class={itemStyle}>
  <div class={classNames(subItemStyle)}>
    <BaseLabel text="Tx Hash" {textSize} />
  </div>
  <CommonChainExplorerLink
    subdirectory="tx"
    value={edgeEventLog().transactionHash}
    isFontMono
    {textSize}
  />
</div>
