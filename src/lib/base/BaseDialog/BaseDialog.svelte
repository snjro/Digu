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
    storeNoDbShowDialog.set(true);
    dialogElement.addEventListener("click", (mouseEvent: MouseEvent) => {
      if (mouseEvent.target === dialogElement) {
        closeDialog(dialogElement);
      }
    });
  }
  export function closeDialog(dialogElement: HTMLDialogElement): void {
    dialogElement.close();
    storeNoDbShowDialog.set(false);
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
  import { storeNoDbShowDialog } from "@stores/storeNoDb";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

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
          "scroll-smooth",
          colorDefinitions[themeColor][colorSettings.dialogBody].bg,
          "p-3",
          ""
        )}
      >
        <slot name="dialogBody" />
      </div>
    </div>
  </dialog>
</div>
