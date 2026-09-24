<script lang="ts">
  import BaseButton from "$lib/base/BaseButton.svelte";
  import { buttonHeight, type BaseSize } from "$lib/base/baseSizes";
  import classNames from "classnames";
  interface Props {
    size: BaseSize;
    href: string;
    label?: string;
  }

  let { size, href, label = "View more details" }: Props = $props();
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
