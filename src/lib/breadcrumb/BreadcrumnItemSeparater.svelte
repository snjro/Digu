<script lang="ts">
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseIcon from "$lib/base/BaseIcon.svelte";
  import { changeSize } from "$lib/base/baseSizes";
</script>

<BaseIcon
  name="slashForward"
  size={changeSize(sizeSettings.breadcrumb, 0)}
  colorCategory={colorSettings.main}
  hoverEffect={false}
/>
