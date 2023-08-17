<script lang="ts">
  import type { BaseSize } from "../baseSizes";
  import type { SyncStateTextLabelProps } from "$lib/common/CommonSyncStateText.svelte";
  import BaseProgressCircleSyncStatusPercentage from "./BaseProgressCircleSyncStatusPercentage.svelte";
  import BaseProgressCircleSyncStatusText from "./BaseProgressCircleSyncStatusText.svelte";

  export let progressRate: number;
  export let percentageSize: BaseSize;
  export let syncStateTextLabelProps: SyncStateTextLabelProps | undefined;
  export let isAnimatePulse: boolean;
</script>

<BaseProgressCircleSyncStatusPercentage
  {progressRate}
  textSize={percentageSize}
  {isAnimatePulse}
/>
<BaseProgressCircleSyncStatusText {syncStateTextLabelProps} />
