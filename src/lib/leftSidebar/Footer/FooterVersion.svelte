<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseLabel from "$lib/base/BaseLabel.svelte";
</script>

<div class="flex items-center">
  <BaseLabel
    text="v0.0.1"
    textSize={sizeSettings.leftSidebarVersion}
    colorCategoryFront={colorSettings.leftSidebarFooter}
  />
</div>
