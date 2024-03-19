<script lang="ts">
  import { page } from "$app/stores";
  import { colorSettings } from "$lib/appearanceConfig/color/colorSettings";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import BaseA from "$lib/base/BaseA.svelte";
  import { capitalizeFirstLetter } from "@utils/utilsCommon";
  import { GITHUB_PAGES_HOST_NAME, PROJECT_NAME } from "@utils/utilsCostants";
  import classNames from "classnames";
</script>

<BaseA
  href={$page.url.hostname.includes(GITHUB_PAGES_HOST_NAME)
    ? `/${PROJECT_NAME}`
    : "/"}
  text={capitalizeFirstLetter(PROJECT_NAME)}
  appendClass={classNames("font-medium")}
  textSize={sizeSettings.leftSidebarLogo}
  colorCategory={colorSettings.leftSidebarHeader}
  hoverEffect={false}
  openNewTab={false}
/>
