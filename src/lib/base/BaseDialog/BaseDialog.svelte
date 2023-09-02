<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";

  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { BaseIconProps } from "../BaseIcon";
  import { closeDialog } from "./BaseDialogHandler";
  import BaseDialogHeader from "./BaseDialogHeader.svelte";

  export let dialogElement: HTMLDialogElement;
  export let headerIconName: BaseIconProps["name"] | undefined = undefined;
  export let headerText: string | undefined;

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let shadowStyle: string;
  $: shadowStyle = classNames(
    themeColor === "dark"
      ? classNames(
          "border",
          colorDefinitions[themeColor][colorSettings.dialogHeader].border,
        )
      : classNames(
          "shadow",
          colorDefinitions[themeColor][colorSettings.dialogHeader].shadow,
        ),
  );
</script>

<div class={classNames("flex")}>
  <dialog
    bind:this={dialogElement}
    class={classNames(
      "flex-initial",
      "min-h-0",
      "rounded",
      shadowStyle,
      "w-fit",
      // "h-full",
      "max-h-[90%]",
      "backdrop:backdrop-brightness-50",
      colorDefinitions[themeColor][colorSettings.dialogHeader].bg,
      "flex-col",
    )}
    on:close
    on:cancel={() => closeDialog(dialogElement)}
  >
    <div class={classNames("flex-initial", "min-h-0", "flex", "flex-col")}>
      <BaseDialogHeader {dialogElement} {headerIconName} {headerText} />
      <slot name="dialogBody" />
    </div>
  </dialog>
</div>

<style>
  dialog[open] {
    display: flex;
  }
</style>
