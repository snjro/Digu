<script lang="ts">
  import { basePath } from "#lib/common/basePath.js";
  import { colorSettings } from "#lib/appearanceConfig/color/colorSettings.js";
  import { sizeSettings } from "#lib/appearanceConfig/size/sizeSettings.js";
  import BaseA from "#lib/base/BaseA.svelte";
  import { capitalizeFirstLetter } from "#utils/utilsCommon.js";
  import { PROJECT_NAME } from "#utils/utilsConstants.js";
  import classNames from "classnames";
</script>

<BaseA
  href={`${basePath}/`}
  text={capitalizeFirstLetter(PROJECT_NAME)}
  appendClass={classNames("font-medium")}
  textSize={sizeSettings.leftSidebarLogo}
  colorCategory={colorSettings.leftSidebarHeader}
  hoverEffect={false}
  openNewTab={false}
/>
