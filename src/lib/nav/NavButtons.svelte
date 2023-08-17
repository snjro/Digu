<script lang="ts">
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { SimplifiedButtonDefinition } from "$lib/base/BaseButtonIcon.svelte";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import type { ThemeColor } from "@db/dbTypes";
  import { updateDbItemUserSettings } from "@db/dbSettingsDataHandlers";
  import { openDialog } from "$lib/base/BaseDialog/BaseDialog.svelte";
  import CommonFunctionButtons from "$lib/common/CommonFunctionBar/CommonFunctionButtons.svelte";
  import NavButtonsSettingsDialog from "./NavButtonsSettingsDialog.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";

  let currentThemeColor: ThemeColor;
  $: currentThemeColor = $storeUserSettings.themeColor;

  let newThemeColor: ThemeColor;
  $: newThemeColor = currentThemeColor === "dark" ? "light" : "dark";

  let initializeValue: boolean = false;
  let dialogElement: HTMLDialogElement;

  let buttonDefinitions: {
    basics: SimplifiedButtonDefinition[];
  };
  $: buttonDefinitions = {
    basics: [
      {
        iconName: "cogOutline",
        tooltipText: "Settings",
        tooltipXPosition: "left",
        tooltipYPosition: "bottom",
        onClickEventFunction: () => {
          openDialog(dialogElement);
          initializeValue = true;
        },
      },
      {
        iconName:
          currentThemeColor === "dark" ? "lightbulbOnOutline" : "weatherNight",
        tooltipText: `Change theme to ${capitalizeFirstLetter(newThemeColor)}`,
        tooltipXPosition: "left",
        tooltipYPosition: "bottom",
        onClickEventFunction: async () => {
          await updateDbItemUserSettings("themeColor", newThemeColor);
        },
      },
    ],
  };
</script>

<div>
  <CommonFunctionButtons
    {buttonDefinitions}
    buttonSize={sizeSettings.navButton}
    listSize={changeSize(sizeSettings.navButton, -1)}
    isOpenSidebar={$storeUserSettings.isOpenSidebar}
    breakPointWidthForOpendSidebar={breakPointWidthThresholds.navButtonForOpenedSidebar}
  />
  <NavButtonsSettingsDialog bind:dialogElement bind:initializeValue />
</div>
