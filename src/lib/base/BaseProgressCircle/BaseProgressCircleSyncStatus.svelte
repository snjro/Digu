<script lang="ts">
  import type { BaseSize } from "../baseSizes";
  import type { SyncStateTextLabelProps } from "$lib/common/CommonSyncStateText.svelte";
  import BaseProgressCircleSyncStatusPercentage from "./BaseProgressCircleSyncStatusPercentage.svelte";
  import BaseProgressCircleSyncStatusText from "./BaseProgressCircleSyncStatusText.svelte";

  interface Props {
    progressRate: number;
    percentageSize: BaseSize;
    syncStateTextLabelProps: SyncStateTextLabelProps | undefined;
    isAnimatePulse: boolean;
  }

  let {
    progressRate,
    percentageSize,
    syncStateTextLabelProps,
    isAnimatePulse,
  }: Props = $props();
</script>

<BaseProgressCircleSyncStatusPercentage
  {progressRate}
  textSize={percentageSize}
  {isAnimatePulse}
/>
<BaseProgressCircleSyncStatusText {syncStateTextLabelProps} />
