<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import type { ConvertedEventLog } from "@db/dbTypes";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { convertJsDateToIso8601 } from "@utils/utilsTime";
  import classNames from "classnames";

  export let convertedEventLogs: ConvertedEventLog[];
  export let edgeType: "latest" | "oldest";

  const textSizeTltle: BaseSize = sizeSettings.itemMember;
  const textSizeValue: BaseSize = changeSize(sizeSettings.itemMember, -1);

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
    "items-center",
    "w-full",
    ""
  );
  const subItemStyle: string = classNames("w-24", "flex-none");
</script>

<div class={itemStyle}>
  <div class={classNames(subItemStyle)}>
    <BaseLabel text="Block Number" textSize={textSizeTltle} />
  </div>

  <CommonChainExplorerLink
    subdirectory="block"
    value={edgeEventLog().blockNumber.toString()}
    isFontMono
    textSize={textSizeValue}
  />
</div>
<div class={itemStyle}>
  <div class={classNames(subItemStyle)}>
    <BaseLabel text="Datetime" textSize={textSizeTltle} />
  </div>
  <BaseLabel
    text={edgeEventLog
      ? convertJsDateToIso8601(edgeEventLog().jsDate)
      : undefined}
    fontMono
    textSize={textSizeValue}
  />
</div>
<div class={itemStyle}>
  <div class={classNames(subItemStyle)}>
    <BaseLabel text="Tx Hash" textSize={textSizeTltle} />
  </div>
  <CommonChainExplorerLink
    subdirectory="tx"
    value={edgeEventLog().transactionHash}
    isFontMono
    textSize={textSizeValue}
  />
</div>
