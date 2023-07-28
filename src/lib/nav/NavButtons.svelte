<script lang="ts">
  import NavButtonsTheme from "./NavButtonsTheme.svelte";
  import { breakPointWidths } from "@utils/utilsDom";
  import BaseButton from "$lib/base/BaseButton.svelte";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import { storeNoDbCurrentWidth } from "@stores/storeNoDb";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import classNames from "classnames";
  import NavButtonsSettings from "./NavButtonsSettings.svelte";
  function onClick() {}
</script>

<div
  class={classNames(
    "flex",
    "flex-row",
    "flex-nowrap",
    "items-center",
    "space-x-2",
    ""
  )}
>
  {#if $storeNoDbCurrentWidth < breakPointWidths.sm}
    <BaseButton type="icon" size={sizeSettings.navButton} on:click={onClick}>
      <BaseIcon
        slot="prefixIcon"
        name="dotsVertical"
        size={sizeSettings.navButton}
      />
    </BaseButton>
  {:else}
    <NavButtonsSettings />
    <NavButtonsTheme />
  {/if}
</div>
