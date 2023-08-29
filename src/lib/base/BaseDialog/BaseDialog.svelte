<script lang="ts" context="module">
  export type BaseDialogProps = {
    dialogElement?: HTMLDialogElement;
    fullScreen?: boolean;
    headerSize?: BaseSize;
    headerIconName?: BaseIconProps["name"];
    headerText?: BaseLabelProps["text"];
  };
  export function openDialog(dialogElement: HTMLDialogElement): void {
    dialogElement.showModal();
    let currentCountShowingDialog: number = get(storeNoDbCountShowingDialog);
    if (currentCountShowingDialog < 0) {
      currentCountShowingDialog = 0;
    }
    storeNoDbCountShowingDialog.set(currentCountShowingDialog + 1);
    dialogElement.addEventListener("click", (mouseEvent: MouseEvent) => {
      if (mouseEvent.target === dialogElement) {
        closeDialog(dialogElement);
      }
    });
  }
  export function closeDialog(dialogElement: HTMLDialogElement): void {
    dialogElement.close();
    let currentCountShowingDialog: number = get(storeNoDbCountShowingDialog);
    if (currentCountShowingDialog < 1) {
      currentCountShowingDialog = 1;
    }
    storeNoDbCountShowingDialog.set(currentCountShowingDialog - 1);
  }
</script>

<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";

  import classNames from "classnames";
  import BaseDialogHeader from "./BaseDialogHeader.svelte";
  import type { BaseIconProps } from "../BaseIcon";
  import type { BaseLabelProps } from "../BaseLabel.svelte";
  import type { BaseSize } from "../baseSizes";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { storeNoDbCountShowingDialog } from "@stores/storeNoDb";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { get } from "svelte/store";

  export let dialogElement: NonNullable<BaseDialogProps["dialogElement"]>;
  export let headerIconName: BaseDialogProps["headerIconName"] = undefined;
  export let headerText: BaseDialogProps["headerText"];

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

<dialog
  bind:this={dialogElement}
  class={classNames(
    "rounded",
    shadowStyle,
    "w-fit",
    "h-full",
    "min-h-0",
    "backdrop:backdrop-brightness-50",
    colorDefinitions[themeColor][colorSettings.dialogHeader].bg,
  )}
  on:close
  on:cancel={() => closeDialog(dialogElement)}
>
  <div class={classNames("h-full", "w-full", "flex", "flex-col")}>
    <BaseDialogHeader {dialogElement} {headerIconName} {headerText} />
    <slot name="dialogBody" />
  </div>
</dialog>

<style>
  dialog[open] {
    max-height: calc(100vh - 80px);
  }
</style>
