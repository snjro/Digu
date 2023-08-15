<script lang="ts">
  import classNames from "classnames";
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import NavButtonLeftSidebar from "./NavButtonLeftSidebar.svelte";
  import { leftSidebarHeaderHeight } from "$lib/leftSidebar/Header/Header.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import NavButtons from "./NavButtons.svelte";
  import SyncListChainRpcInput from "./SyncListChainRpcInput.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import SyncStatus from "./syncStatus/SyncStatus.svelte";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let navClass: string;
  $: navClass = classNames(
    "pl-3",
    "pr-3",
    leftSidebarHeaderHeight,
    colorDefinitions[themeColor][colorSettings.navBg].bg,
    "flex",
    "flex-row",
    "justify-between",
    "items-center",
    "space-x-3",
    "border-b",
    colorDefinitions[themeColor][colorSettings.navBg].border,
    ""
  );
</script>

<nav class={navClass}>
  {#if !$storeUserSettings.isOpenSidebar}
    <NavButtonLeftSidebar />
  {/if}
  <div
    class={classNames(
      "flex",
      "flex-row",
      "space-x-3",
      "items-center",
      "max-w-3xl",
      // "min-w-fit",
      "w-full"
    )}
  >
    <SyncListChainRpcInput />
    <SyncStatus />
  </div>
  <NavButtons />
</nav>
