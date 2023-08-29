<script lang="ts">
  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import type { SimplifiedButtonDefinition } from "$lib/base/BaseButtonIcon.svelte";
  import { openDialog } from "$lib/base/BaseDialog/BaseDialog.svelte";
  import { changeSize } from "$lib/base/baseSizes";
  import CommonFunctionButtons from "$lib/common/CommonFunctionBar/CommonFunctionButtons.svelte";
  import { updateDbItemUserSettings } from "@db/dbSettingsDataHandlers";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import NavButtonsSettingsDialog from "./NavButtonsSettingsDialog.svelte";

  let currentThemeColor: ThemeColor;
  $: currentThemeColor = $storeUserSettings.themeColor;

  let newThemeColor: ThemeColor;
  $: newThemeColor = currentThemeColor === "dark" ? "light" : "dark";

  let initializeValue: boolean = false;
  let dialogElement: HTMLDialogElement;

  let buttonDefinitions: Array<SimplifiedButtonDefinition[]>;
  $: buttonDefinitions = [
    [
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
  ];
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
