<script lang="ts">
  import { version } from "$app/environment";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import { GITHUB_REPOSITORY_URL } from "@utils/utilsCostants";

  const versionName: string = `v${version}`;
</script>

<div class="flex items-center">
  <BaseA
    text={versionName}
    textSize={sizeSettings.leftSidebarVersion}
    href={`${GITHUB_REPOSITORY_URL}/releases/tag/${versionName}`}
    colorCategory={colorSettings.leftSidebarFooter}
  />
</div>
