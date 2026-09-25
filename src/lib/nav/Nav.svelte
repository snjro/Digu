<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { leftSidebarHeaderHeight } from "$lib/leftSidebar/Header/Header.svelte";
  import classNames from "classnames";
  import NavButtonLeftSidebar from "./NavButtonLeftSidebar.svelte";
  import NavButtons from "./NavButtons.svelte";
  import SyncListChainRpcInput from "./SyncListChainRpcInput.svelte";
  import SyncStatus from "./syncStatus/SyncStatus.svelte";

  let navClass: string = $derived(
    classNames(
      "px-3",
      "flex-none",
      leftSidebarHeaderHeight,
      colorClasses[colorSettings.navBg].bg,
      "flex",
      "flex-row",
      "items-center",
      "space-x-3",
      "border-b",
      colorClasses[colorSettings.navBg].border,
      "",
    ),
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
      "space-x-1",
    )}
  >
    <SyncListChainRpcInput />

    <SyncStatus />
  </div>
  <NavButtons />
</nav>
