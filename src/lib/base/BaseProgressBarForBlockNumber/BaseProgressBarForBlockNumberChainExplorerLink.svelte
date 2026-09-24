<script lang="ts">
  import CommonChainExplorerLink from "$lib/common/CommonChainExplorerLink.svelte";
  import type { BaseSize } from "$lib/base/baseSizes";
  interface Props {
    textSize: BaseSize;
    blocknumber: number;
  }

  let { textSize, blocknumber }: Props = $props();
</script>

<CommonChainExplorerLink
  value={blocknumber.toString()}
  {textSize}
  subdirectory="block"
  withIcon={true}
  showCopyButton={false}
/>
