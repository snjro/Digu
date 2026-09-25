<script lang="ts" module>
  export type BaseInputProps = {
    type: HTMLInputTypeAttribute;
    value?: string | number;
    size?: BaseSize;
    forcedClass?: string;
    appendClass?: string;
    colorCategory: ColorCategory;
    disabled?: boolean;
    border?: boolean;
    truncate?: boolean;
    placeholder?: string;
    labelProps?: BaseLabelProps;
    helperTextState?: HelperTextState;
  };
</script>

<script lang="ts">
  import {
    colorDefinitions,
    type ColorCategory,
  } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { HelperTextState } from "./helperTextState";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import type { Snippet } from "svelte";
  import type { HTMLInputTypeAttribute } from "svelte/elements";
  import BaseLabel, { type BaseLabelProps } from "./BaseLabel.svelte";
  import type { BaseSize } from "./baseSizes";
  import { baseTextSizes } from "./baseSizes";

  interface Props {
    type: BaseInputProps["type"];
    value?: BaseInputProps["value"];
    size?: NonNullable<BaseInputProps["size"]>;
    forcedClass?: BaseInputProps["forcedClass"];
    appendClass?: BaseInputProps["appendClass"];
    colorCategory: ColorCategory;
    colorCategoryBorder: ColorCategory;
    disabled?: NonNullable<BaseInputProps["disabled"]>;
    truncate?: NonNullable<BaseInputProps["truncate"]>;
    labelProps?: BaseInputProps["labelProps"];
    helperTextState?: BaseInputProps["helperTextState"];
    placeholder?: BaseInputProps["placeholder"];
    onchange?: ((event: Event) => void) | undefined;
    onfocus?: ((event: FocusEvent) => void) | undefined;
    onblur?: ((event: FocusEvent) => void) | undefined;
    prefixIcon?: Snippet;
    suffixIcon?: Snippet;
    inputHelper?: Snippet;
    ariaLabel?: string;
  }

  let {
    type,
    value = $bindable(undefined),
    size = "md",
    forcedClass = undefined,
    appendClass = undefined,
    colorCategory,
    colorCategoryBorder,
    disabled = false,
    truncate = true,
    labelProps = undefined,
    helperTextState = undefined,
    placeholder = undefined,
    onchange = undefined,
    onfocus = undefined,
    onblur = undefined,
    prefixIcon,
    suffixIcon,
    inputHelper,
    ariaLabel = undefined,
  }: Props = $props();

  const inputPaddingSizes: { [key in BaseSize]: string } = {
    xs: "px-0.5 py-0.5",
    sm: "px-1 py-0.5",
    md: "px-1 py-1",
    lg: "px-1 py-1",
    xl: "px-1 py-1.5",
    "2xl": "px-1 py-1.5",
    "3xl": "px-1 py-2",
    "4xl": "px-1 py-2",
    "5xl": "px-2 py-2.5",
  };
  const prefixIconPaddingSizes: { [key in BaseSize]: string } = {
    xs: "pl-1",
    sm: "pl-1.5",
    md: "pl-2",
    lg: "pl-2",
    xl: "pl-2.5",
    "2xl": "pl-3",
    "3xl": "pl-3.5",
    "4xl": "pl-3.5",
    "5xl": "pl-4",
  };
  const sufixIconPaddingSizes: { [key in BaseSize]: string } = {
    xs: "pr-1",
    sm: "pr-1.5",
    md: "pr-2",
    lg: "pr-2",
    xl: "pr-2.5",
    "2xl": "pr-3",
    "3xl": "pr-3.5",
    "4xl": "pr-3.5",
    "5xl": "pr-4",
  };

  let themeColor: ThemeColor = $derived($storeUserSettings.themeColor);

  let customClass: string = $derived(
    forcedClass ??
      classNames(
        "w-full",
        truncate && "truncate",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",
        "bg-transparent",
        colorDefinitions[themeColor][colorCategory].text,
        "placeholder:italic",
        colorDefinitions[themeColor][colorCategory].textPlaceholder,
        baseTextSizes[size],
        inputPaddingSizes[size],
        "noborder",
        appendClass,
      ),
  );
  /** Sets `value` from a parent that holds this component with `bind:this`. */
  export function setValue(newValue: BaseInputProps["value"]): void {
    value = newValue;
  }
  const handleInput = (event: Event): void => {
    value = (event.target as HTMLInputElement).value;
  };
  let isFocus: boolean = $state(false);
  const setFocused = (value: boolean) => {
    isFocus = value;
  };
  let borderStyle: string = $derived(
    classNames(
      "border-2",
      isFocus
        ? colorDefinitions[themeColor]["interactive"].border
        : colorDefinitions[themeColor][colorCategoryBorder].border,
      "",
    ),
  );
  let shadowStyle: string = $derived(
    classNames(
      themeColor === "light" &&
        classNames(
          "shadow-inner",
          colorDefinitions[themeColor][colorCategory].shadow,
        ),
    ),
  );
</script>

<div
  class={classNames(
    "flex",
    "flex-col",
    "h-fit",
    "w-full",
    "justify-items-start",
  )}
>
  {#if labelProps}
    <BaseLabel {...labelProps} />
  {/if}
  <div
    class={classNames(
      "flex",
      "flex-row",
      "items-center",
      "justify-items-start",
      "rounded-md",
      shadowStyle,
      borderStyle,
      colorDefinitions[themeColor][colorCategory].bg,
    )}
  >
    {#if prefixIcon}
      <div
        class={classNames(
          prefixIconPaddingSizes[size],
          "flex",
          "items-center",
          "justify-items-start",
        )}
      >
        {@render prefixIcon?.()}
      </div>
    {/if}
    <input
      {type}
      value={value ?? ""}
      spellcheck={false}
      {disabled}
      placeholder={isFocus ? undefined : placeholder}
      aria-label={ariaLabel}
      onblur={(event) => {
        setFocused(false);
        onblur?.(event);
      }}
      {onchange}
      onfocus={(event) => {
        setFocused(true);
        onfocus?.(event);
      }}
      oninput={handleInput}
      class={customClass}
    />
    {#if suffixIcon}
      <div
        class={classNames(
          sufixIconPaddingSizes[size],
          "flex",
          "items-center",
          "justify-items-start",
        )}
      >
        {@render suffixIcon?.()}
      </div>
    {/if}
  </div>
  {#if inputHelper}
    <div
      class={classNames("h-5", "font-light", {
        invisible: !helperTextState,
      })}
    >
      {@render inputHelper?.()}
    </div>
  {/if}
</div>

<style lang="scss">
  .noborder {
    &:focus {
      outline: none !important;
      border: none !important;
    }
  }
</style>
