<script lang="ts">
  import { version } from "$app/env";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseA from "#lib/base/BaseA.svelte";
  import { GITHUB_REPOSITORY_URL } from "@utils/utilsConstants";

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
