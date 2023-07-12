<!-- TODO: delete this file. -->
<script lang="ts">
  import type { ThemeColor } from "@db/dbTypes";
  import { colorDefinitions, type ColorCategory } from "./colorDefinitions";
  import ColorTestItem from "./colorTestItem.svelte";
  import classNames from "classnames";

  function getThemeColors(): ThemeColor[] {
    return Object.keys(colorDefinitions) as ThemeColor[];
  }
  function getColorCategories(themeColor: ThemeColor): ColorCategory[] {
    return Object.keys(colorDefinitions[themeColor]) as ColorCategory[];
  }
</script>

{#each getThemeColors() as targetThemeColor}
  <div class={classNames("grid", "grid-cols-10", "gap-3")}>
    <p class={classNames("col-span-full")}>
      {targetThemeColor}
    </p>
    {#each getColorCategories(targetThemeColor) as targetColorCategory}
      <div class={classNames("col-span-1")}>
        <p>{targetColorCategory}</p>
        <ColorTestItem
          themeColor={targetThemeColor}
          colorCategory={targetColorCategory}
        />
      </div>
    {/each}
  </div>
{/each}
