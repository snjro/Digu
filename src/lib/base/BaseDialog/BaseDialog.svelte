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
  import { scrollbarStyle } from "$lib/appearanceConfig/scrollbar/scrollbarSetting";

  export let dialogElement: NonNullable<BaseDialogProps["dialogElement"]>;
  export let fullScreen: NonNullable<BaseDialogProps["fullScreen"]> = false;
  export let headerIconName: BaseDialogProps["headerIconName"] = undefined;
  export let headerText: BaseDialogProps["headerText"];

  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;

  let shadowStyle: string;
  $: shadowStyle = classNames(
    themeColor === "dark"
      ? classNames(
          "border",
          colorDefinitions[themeColor][colorSettings.dialogHeader].border
        )
      : classNames(
          "shadow",
          colorDefinitions[themeColor][colorSettings.dialogHeader].shadow
        )
  );
</script>

<div class={classNames("relative")}>
  <dialog
    bind:this={dialogElement}
    class={classNames(
      "p-0",
      "absolute",
      "top-0",
      "rounded-lg",
      // "shadow dark:shadow-none",
      shadowStyle,
      fullScreen ? "h-screen w-screen" : "w-fit max-h-fit",
      "overflow-hidden",
      ""
    )}
    on:close
    on:cancel={() => closeDialog(dialogElement)}
  >
    <div
      class={classNames(
        "flex flex-col",
        "w-full",
        "max-h-screen",
        "overflow-hidden",
        ""
      )}
    >
      <BaseDialogHeader {dialogElement} {headerIconName} {headerText} />
      <div
        class={classNames(
          "h-full",
          "overflow-y-auto",
          scrollbarStyle(colorSettings.dialogBody).thick,
          colorDefinitions[themeColor][colorSettings.dialogBody].bg,
          ""
        )}
      >
        <slot name="dialogBody" />
      </div>
    </div>
  </dialog>
</div>
