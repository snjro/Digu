<script lang="ts">
  import BaseLabel from "$lib/base/BaseLabel.svelte";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
</script>

<div class="flex items-center">
  <BaseLabel
    text="v0.0.1"
    textSize={sizeSettings.leftSidebarVersion}
    colorCategoryFront={colorSettings.leftSidebarFooter}
  />
</div>
