<script lang="ts">
  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";

  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
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

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let shadowStyle: string = $derived(
    classNames(
      themeColor === "dark"
        ? classNames(
            "border",
            colorDefinitions[themeColor][colorSettings.dialogHeader].border,
          )
        : classNames(
            "shadow-sm",
            colorDefinitions[themeColor][colorSettings.dialogHeader].shadow,
          ),
    ),
  );
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
      colorDefinitions[themeColor][colorSettings.dialogHeader].bg,
      "flex-col",
    )}
    {onclose}
    oncancel={() => closeDialog(dialogElement)}
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
