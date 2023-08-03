<script lang="ts" context="module">
  export type RadioLabelAndValues<RadioValue> = ReadonlyArray<{
    labelText: string;
    value: RadioValue;
    inputId: string;
    href?: string | undefined;
  }>;
  export const radioSizes: { [key in BaseSize]: string } = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-7 h-7",
    "2xl": "w-8 h-8",
    "3xl": "w-9 h-9",
    "4xl": "w-10 h-10",
    "5xl": "w-11 h-11",
  };
</script>

<script lang="ts" generics="RadioValue">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";

  import { colorDefinitions } from "$lib/appearanceConfig/color/colorDefinitions";
  import type { ThemeColor } from "@db/dbTypes";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import classNames from "classnames";
  import BaseButton from "./BaseButton.svelte";
  import BaseIcon from "./BaseIcon.svelte";
  import BaseLabel from "./BaseLabel.svelte";
  import type { BaseSize } from "./baseSizes";

  export let radioButtonType: "button" | "tab" | "circle" = "circle";
  export let groupName: string;
  export let selectedValue: RadioValue;
  export let size: BaseSize;
  export let labelAndValues: RadioLabelAndValues<RadioValue>;
  export let disabled: boolean = false;
  export let appendLabelClass: string | undefined = undefined;
  let themeColor: ThemeColor;
  $: themeColor = $storeUserSettings.themeColor as ThemeColor;
  const roundedSize = (
    roundPosition: "tl" | "tr" | "l" | "r"
  ): `rounded-${string}` => {
    switch (roundPosition) {
      case "tl":
        switch (size) {
          case "xs":
            return "rounded-tl-sm";
          case "sm":
            return "rounded-tl";
          case "md":
            return "rounded-tl-md";
          case "lg":
            return "rounded-tl-lg";
          case "xl":
            return "rounded-tl-xl";
          case "2xl":
            return "rounded-tl-2xl";
          case "3xl":
            return "rounded-tl-3xl";
          default:
            return "rounded-tl-full";
        }
      case "tr":
        switch (size) {
          case "xs":
            return "rounded-tr-sm";
          case "sm":
            return "rounded-tr";
          case "md":
            return "rounded-tr-md";
          case "lg":
            return "rounded-tr-lg";
          case "xl":
            return "rounded-tr-xl";
          case "2xl":
            return "rounded-tr-2xl";
          case "3xl":
            return "rounded-tr-3xl";
          default:
            return "rounded-tr-full";
        }
      case "l":
        switch (size) {
          case "xs":
            return "rounded-l-sm";
          case "sm":
            return "rounded-l";
          case "md":
            return "rounded-l-md";
          case "lg":
            return "rounded-l-lg";
          case "xl":
            return "rounded-l-xl";
          case "2xl":
            return "rounded-l-2xl";
          case "3xl":
            return "rounded-l-3xl";
          default:
            return "rounded-l-full";
        }
      default:
        switch (size) {
          case "xs":
            return "rounded-r-sm";
          case "sm":
            return "rounded-r";
          case "md":
            return "rounded-r-md";
          case "lg":
            return "rounded-r-lg";
          case "xl":
            return "rounded-r-xl";
          case "2xl":
            return "rounded-r-2xl";
          case "3xl":
            return "rounded-r-3xl";
          default:
            return "rounded-r-full";
        }
    }
  };

  const buttonRoundStyle = (
    currentButtonIndex: number,
    lastButtonIndex: number
  ): string => {
    switch (currentButtonIndex) {
      case 0:
        return classNames(
          roundedSize("tl"),
          "rounded-r-none",
          radioButtonType === "tab" && "rounded-bl-none"
        );
      case lastButtonIndex:
        return classNames(
          roundedSize("tr"),
          "rounded-l-none",
          radioButtonType === "tab" && "rounded-br-none"
        );
      default:
        return "rounded-none";
    }
  };
</script>

{#if radioButtonType === "circle"}
  <div class={classNames("flex", "flex-col", "space-y-1")}>
    {#each labelAndValues as { labelText, value, inputId }}
      <div
        class={classNames(
          // childGridColSpan(),
          "flex",
          "flex-row",
          "items-center",
          "w-fit",
          // "space-x-2",
          ""
        )}
      >
        <div
          class={classNames(
            radioSizes[size],
            "flex",
            "items-center",
            "justify-center",
            "rounded-full",
            "shadow-inner dark:shadow-none",
            "shadow-inherit",
            "bg-inherit",
            themeColor === "dark" && "border",

            ""
          )}
        >
          <input
            type="radio"
            {disabled}
            id={inputId}
            name={groupName}
            bind:group={selectedValue}
            {value}
            {...$$restProps}
            class={classNames(
              radioSizes[size],
              "rounded-full",
              "opacity-0",
              "absolute",
              "appearance-none",
              "cursor-pointer",
              ""
            )}
          />
          <BaseIcon
            name={selectedValue === value ? "circleMedium" : "blank"}
            {size}
            colorCategory={colorSettings.tabSelected}
          />
        </div>
        <BaseLabel
          appendClass={classNames("pl-1", appendLabelClass)}
          {disabled}
          text={labelText}
          {inputId}
          textSize={size}
          colorCategoryFront={colorSettings.tabSelected}
          cursorPointer
        />
      </div>
    {/each}
  </div>
{:else}
  <div
    class={classNames(
      "flex",
      "flex-row",
      "h-full",
      "w-fit",
      // themeColor !== "dark" && radioButtonType === "tab" && "shadow-sm",
      // colorDefinitions[themeColor][colorSettings.tabSelected].shadow,
      roundedSize(radioButtonType === "tab" ? "tl" : "l"),
      roundedSize(radioButtonType === "tab" ? "tr" : "r"),
      radioButtonType === "tab" &&
        colorDefinitions[themeColor][colorSettings.tabSelected].bg,
      // "space-x-px",
      "static"
    )}
  >
    {#each labelAndValues as { labelText, value, inputId, href }, i}
      <div
        class={classNames(
          radioButtonType === "button" &&
            selectedValue === value &&
            themeColor !== "dark" &&
            "pt-0.5"
        )}
      >
        <input
          type="radio"
          {disabled}
          id={inputId}
          name={groupName}
          bind:group={selectedValue}
          {value}
          {...$$restProps}
          class={classNames(
            "w-0",
            "h-0",
            "opacity-0",
            "absolute",
            "appearance-none",
            ""
          )}
        />
        <BaseButton
          label={labelText}
          {disabled}
          {size}
          {href}
          border={radioButtonType === "tab"
            ? selectedValue !== value
            : themeColor === "dark" && true}
          shadowEffect={radioButtonType === "button" &&
            selectedValue !== value &&
            themeColor !== "dark"}
          underlineLabel={selectedValue === value}
          popupEffect={selectedValue !== value && themeColor !== "dark"}
          hoverEffect={selectedValue !== value}
          colorCategoryFront={selectedValue === value
            ? colorSettings.tabSelected
            : colorSettings.tabUnselected}
          colorCategoryBg={selectedValue === value
            ? colorSettings.tabSelected
            : colorSettings.tabUnselected}
          appendClass={classNames(
            "h-full",
            buttonRoundStyle(i, labelAndValues.length - 1),
            ""
          )}
          on:click={() => {
            selectedValue = value;
          }}
        />
      </div>
    {/each}
  </div>
{/if}
