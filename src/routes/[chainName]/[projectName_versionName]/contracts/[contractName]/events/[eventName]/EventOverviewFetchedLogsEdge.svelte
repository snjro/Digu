<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { changeSize, type BaseSize } from "$lib/base/baseSizes";
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import type { ConvertedEventLog } from "@db/dbTypes";
  import { convertJsDateToIso8601 } from "@utils/utilsTime";
  import classNames from "classnames";

  interface Props {
    edgeEventLog: ConvertedEventLog;
  }

  let { edgeEventLog }: Props = $props();

  const textSizeTltle: BaseSize = sizeSettings.itemMember;
  const textSizeValue: BaseSize = changeSize(sizeSettings.itemMember, -1);

  const itemStyle: string = classNames(
    "flex",
    "flex-row",
    "items-center",
    "w-full",
    "",
  );
  const subItemStyle: string = classNames("w-24", "flex-none");
</script>

<div class={itemStyle}>
  <div class={classNames(subItemStyle)}>
    <BaseLabel text="Block Number" textSize={textSizeTltle} />
  </div>

  <CommonChainExplorerLink
    subdirectory="block"
    value={edgeEventLog.blockNumber.toString()}
    isFontMono
    textSize={textSizeValue}
  />
</div>
<div class={itemStyle}>
  <div class={classNames(subItemStyle)}>
    <BaseLabel text="Datetime" textSize={textSizeTltle} />
  </div>
  <BaseLabel
    text={convertJsDateToIso8601(edgeEventLog.jsDate)}
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
    value={edgeEventLog.transactionHash}
    isFontMono
    textSize={textSizeValue}
  />
</div>
