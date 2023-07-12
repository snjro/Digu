<script lang="ts">
  import type { BaseIconProps } from "$lib/base/BaseIcon";
  import BaseNavButton from "./BaseNavButton.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { toggleLeftSideBar } from "$lib/leftSidebar/functions";

  async function click() {
    await toggleLeftSideBar();
  }
  let iconName: BaseIconProps["name"];
  $: iconName = $storeUserSettings.isOpenSidebar ? "backburger" : "menu";
</script>

<BaseNavButton {iconName} on:click={click} />
