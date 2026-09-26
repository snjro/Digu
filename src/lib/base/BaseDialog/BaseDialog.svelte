<script lang="ts">
  import { colorClasses } from "$lib/appearanceConfig/color/colorVariables";

  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import classNames from "classnames";
  import type { Snippet } from "svelte";
  import type { BaseIconProps } from "../BaseIcon";
  import BaseSnackbar from "../BaseSnackbar.svelte";
  import { closeDialog } from "./BaseDialogHandler";
  import BaseDialogHeader from "./BaseDialogHeader.svelte";

  interface Props {
    dialogElement?: HTMLDialogElement;
    headerIconName?: BaseIconProps["name"] | undefined;
    headerText: string | undefined;
    onclose?: ((event: Event) => void) | undefined;
    dialogBody?: Snippet;
  }

  let {
    dialogElement = $bindable(),
    headerIconName = undefined,
    headerText,
    onclose = undefined,
    dialogBody,
  }: Props = $props();

  // A shadow in the light theme, a border in the dark theme.
  // The color classes do nothing without the shadow or the border width.
  const shadowStyle: string = classNames(
    "shadow-sm",
    "dark:shadow-none",
    "dark:border",
    colorClasses[colorSettings.dialogHeader].shadow,
    colorClasses[colorSettings.dialogHeader].border,
  );

  // Close only when both the press and the release are on the backdrop,
  // so a drag out of or into the dialog keeps it open. The click alone
  // cannot tell, because it goes to the dialog in both cases.
  let isPressedOnBackdrop: boolean = false;
  let isReleasedOnBackdrop: boolean = false;
  function forgetPress(): void {
    isPressedOnBackdrop = false;
    isReleasedOnBackdrop = false;
  }
  function onMouseDown(event: MouseEvent): void {
    isPressedOnBackdrop = event.target === dialogElement;
  }
  function onMouseUp(event: MouseEvent): void {
    isReleasedOnBackdrop = event.target === dialogElement;
  }
  function onClick(event: MouseEvent): void {
    const isBackdropClick: boolean =
      isPressedOnBackdrop &&
      isReleasedOnBackdrop &&
      event.target === dialogElement;
    forgetPress();
    if (isBackdropClick) closeDialog(dialogElement);
  }
  function onClose(event: Event): void {
    forgetPress();
    onclose?.(event);
  }
</script>

<div class={classNames("flex")}>
  <dialog
    bind:this={dialogElement}
    class={classNames(
      "flex-initial",
      "m-auto",
      "min-h-0",
      "rounded-sm",
      shadowStyle,
      "w-fit",
      // "h-full",
      "max-h-[90%]",
      "backdrop:backdrop-brightness-50",
      colorClasses[colorSettings.dialogHeader].bg,
      "flex-col",
    )}
    onclose={onClose}
    oncancel={() => closeDialog(dialogElement)}
    onmousedown={onMouseDown}
    onmouseup={onMouseUp}
    onclick={onClick}
  >
    <div class={classNames("flex-initial", "min-h-0", "flex", "flex-col")}>
      <BaseDialogHeader {dialogElement} {headerIconName} {headerText} />
      {@render dialogBody?.()}
    </div>
    <BaseSnackbar />
  </dialog>
</div>

<style>
  dialog[open] {
    display: flex;
  }
</style>
