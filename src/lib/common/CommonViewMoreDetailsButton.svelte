<script lang="ts">
  import BaseButton from "$lib/base/BaseButton.svelte";
  import { buttonHeight, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  export let size: BaseSize;
  export let href: string;
  export let label: string = "View more details";
</script>

<div class={classNames("h-full", "flex", "items-end", "justify-end")}>
  <BaseButton
    {size}
    {href}
    colorCategoryFront="white"
    colorCategoryBg="interactive"
    {label}
    openNewTab={false}
    appendClass={buttonHeight[size]}
  />
</div>
