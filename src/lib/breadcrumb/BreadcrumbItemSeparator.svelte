<script lang="ts">
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseIcon from "#lib/base/BaseIcon.svelte";
  import { changeSize } from "#lib/base/baseSizes.js";
</script>

<BaseIcon
  name="slashForward"
  size={changeSize(sizeSettings.breadcrumb, 0)}
  colorCategory={colorSettings.main}
  hoverEffect={false}
/>
