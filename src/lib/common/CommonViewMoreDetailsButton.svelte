<script lang="ts">
  import BaseButton from "$lib/base/BaseButton.svelte";
  import { buttonHeight, type BaseSize } from "$lib/base/baseSizes";
  export let size: BaseSize;
  export let href: string;
</script>

<BaseButton
  {size}
  {href}
  colorCategoryFront="interactive"
  label="View more details"
  openNewTab={false}
  appendClass={buttonHeight[size]}
/>
