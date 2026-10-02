<script lang="ts">
  import type { PageWrapperContentFunctionBarDefinition } from "$lib/PageWrapper/PageWrapperContentFunctionBar.svelte";
  import PageWrapperContentFunctionBarButtons from "$lib/PageWrapper/PageWrapperContentFunctionBarButtons.svelte";
  import { breakPointWidthThresholds } from "$lib/appearanceConfig/size/sizeDefinitions";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { openDialog } from "$lib/base/BaseDialog/BaseDialogHandler";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import NavButtonsSettingsDialog from "./NavButtonsSettingsDialog.svelte";
  import { toggleThemeColor } from "./themeColor";

  let currentThemeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let dialogElement = $state<HTMLDialogElement>();

  let buttonsDefinition: PageWrapperContentFunctionBarDefinition["buttonsDefinition"] =
    $derived([
      [
        {
          iconName: currentThemeColor === "dark" ? "weatherNight" : "sun",
          tooltipText: `Change theme`,
          tooltipXPosition: "left",
          tooltipYPosition: "bottom",
          onClickEventFunction: async () => {
            await toggleThemeColor(currentThemeColor);
          },
        },
        {
          iconName: "cogOutline",
          tooltipText: "Settings",
          tooltipXPosition: "left",
          tooltipYPosition: "bottom",
          onClickEventFunction: () => {
            openDialog(dialogElement);
          },
        },
      ],
    ]);
</script>

<div>
  <NavButtonsSettingsDialog bind:dialogElement />
  <PageWrapperContentFunctionBarButtons
    functionBarDefinition={{
      buttonsDefinition: buttonsDefinition,
      showThreeDotsButton: true,
      buttonSize: sizeSettings.navButton,
      breakPointWidthForOpenedSidebar:
        breakPointWidthThresholds.navButtonForOpenedSidebar,
      horizontalAlignment: "end",
    }}
  />
</div>
