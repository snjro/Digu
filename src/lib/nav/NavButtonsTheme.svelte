<script lang="ts">
  import { updateDbItemUserSettings } from "@db/dbSettingsDataHandlers";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import BaseNavButton from "./BaseNavButton.svelte";

  const click = async () => {
    let newThemeColor: ThemeColor;
    if ($storeUserSettings.themeColor === "dark") {
      newThemeColor = "light";
    } else {
      newThemeColor = "dark";
    }
    await updateDbItemUserSettings("themeColor", newThemeColor);
  };
</script>

<BaseNavButton
  on:click={click}
  iconName={$storeUserSettings.themeColor === "dark"
    ? "lightbulbOnOutline"
    : "weatherNight"}
/>
