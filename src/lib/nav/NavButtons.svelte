<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseButtonIcon from "#lib/base/BaseButtonIcon.svelte";
  import type { ThemeColor } from "#db/dbTypes.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import classNames from "classnames";
  import { toggleThemeColor } from "./themeColor";

  let currentThemeColor: ThemeColor = $derived($storeUserSettings.themeColor);
</script>

<!-- The only button, so it has no "three dots" menu on a narrow screen. -->
<div class={classNames("h-fit", "w-fit", "flex", "flex-row", "items-center")}>
  <BaseButtonIcon
    size={sizeSettings.navButton}
    iconName={currentThemeColor === "dark" ? "weatherNight" : "sun"}
    tooltipText="Change theme"
    tooltipXPosition="left"
    tooltipYPosition="bottom"
    colorCategoryBg={colorSettings.gridFunctionButton}
    colorCategoryFront={colorSettings.gridFunctionButton}
    onclick={async () => {
      await toggleThemeColor(currentThemeColor);
    }}
  />
</div>
