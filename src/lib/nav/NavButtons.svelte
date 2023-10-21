<script lang="ts">
  import type { PageWrapperContentFunctionBarDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  import PageWrapperContentFunctionBarButtons from "$lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { openDialog } from "$lib/base/BaseDialog/BaseDialogHandler";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import NavButtonsSettingsDialog from "./NavButtonsSettingsDialog.svelte";
  import { updateDbItemUserSettings } from "@db/dbSettings";

  let currentThemeColor: ThemeColor;
  $: currentThemeColor = $storeUserSettings.themeColor;

  let newThemeColor: ThemeColor;
  $: newThemeColor = currentThemeColor === "dark" ? "light" : "dark";

  let initializeValue: boolean = false;
  let dialogElement: HTMLDialogElement;

  let buttonsDefinition: PageWrapperContentFunctionBarDefinition["buttonsDefinition"];
  $: buttonsDefinition = [
    [
      {
        iconName:
          currentThemeColor === "dark" ? "weatherNight" : "whiteBalanceSunny",
        tooltipText: `Change theme`,
        tooltipXPosition: "left",
        tooltipYPosition: "bottom",
        onClickEventFunction: async () => {
          await updateDbItemUserSettings("themeColor", newThemeColor);
        },
      },
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
    ],
  ];
</script>

<div>
  <NavButtonsSettingsDialog bind:dialogElement bind:initializeValue />
  <PageWrapperContentFunctionBarButtons
    functionBarDefinition={{
      buttonsDefinition: buttonsDefinition,
      showThreeDotsButton: true,
      buttonSize: sizeSettings.navButton,
      breakPointWidthForOpendSidebar:
        breakPointWidthThresholds.navButtonForOpenedSidebar,
      horizontalAlignment: "end",
    }}
  />
</div>
