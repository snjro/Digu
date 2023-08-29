<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { leftSidebarHeaderHeight } from "$lib/leftSidebar/Header/Header.svelte";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import NavButtonLeftSidebar from "./NavButtonLeftSidebar.svelte";
  import NavButtons from "./NavButtons.svelte";
  import SyncListChainRpcInput from "./SyncListChainRpcInput.svelte";
  import SyncStatus from "./syncStatus/SyncStatus.svelte";

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let navClass: string;
  $: navClass = classNames(
    "px-3",
    "flex-none",
    leftSidebarHeaderHeight,
    colorDefinitions[themeColor][colorSettings.navBg].bg,
    "flex",
    "flex-row",
    "items-center",
    "space-x-3",
    "border-b",
    colorDefinitions[themeColor][colorSettings.navBg].border,
    ""
  );
</script>

<nav class={navClass}>
  <NavButtonLeftSidebar />
  <div
    class={classNames(
      "flex",
      "flex-row",
      "w-full",
      "items-center",
      "space-x-1"
    )}
  >
    <SyncListChainRpcInput />

    <SyncStatus />
  </div>
  <NavButtons />
</nav>
