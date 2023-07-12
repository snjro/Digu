<script lang="ts">
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  export let textSize: BaseSize;
  export let blocknumber: number;
</script>

<CommonChainExplorerLink
  value={blocknumber.toString()}
  {textSize}
  subdirectory="block"
  withIcon={true}
  showCopyButton={false}
/>
