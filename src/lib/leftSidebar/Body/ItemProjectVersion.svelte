<script lang="ts">
  // import BaseItem from "./BaseItem.svelte";
  import type { ChainName } from "@constants/chains/types";
  import BaseAccordion from "./BaseAccordion.svelte";
  // import { directoryItems } from "./directoryDefinitions";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import classNames from "classnames";
  import ItemContract from "./ItemContract.svelte";
  import {
    getProjectVersionNameForLabel,
    getProjectVersionNameForUrl,
  } from "@routes/[chainName]/[projectName_versionName]/projectVersionNameHelper";
  import { sizeSettings } from "$lib/appearanceConfig/size/sizeSettings";
  import { tabValuesForContract } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/+page.svelte";
  import { convertToKebabCase } from "@utils/utilsCommon";

  let chainName: ChainName;
  $: chainName = $storeUserSettings.selectedChainName.toString();
  let rootPath: string;
  $: rootPath = `/${chainName}`;
  $: targetChain = getTargetChain({
    chainName: chainName,
  });
</script>

{#each targetChain.projects as targetProject (targetProject.name)}
  {#each targetProject.versions as targetVersion (targetVersion.name)}
    <div class={classNames("w-full", "h-fit", "")}>
      <BaseAccordion
        label={getProjectVersionNameForLabel(
          targetProject.name,
          targetVersion.name
        )}
        iconName={undefined}
        href={rootPath +
          `/${getProjectVersionNameForUrl(
            targetProject.name,
            targetVersion.name
          )}`}
        isTopLevelItem
        showVerticalLine={false}
        size={sizeSettings.leftSidebarTreeTop}
      >
        <div class={classNames("pl-4")} slot="baseAccordionChildren">
          <BaseAccordion
            label="Contracts"
            iconName={undefined}
            href={rootPath +
              `/${getProjectVersionNameForUrl(
                targetProject.name,
                targetVersion.name
              )}/contracts`}
            showVerticalLine
            size={sizeSettings.leftSidebarTreeMiddle}
          >
            <svelte:fragment slot="baseAccordionChildren">
              {#each targetVersion.contracts as targetContract (targetContract.name)}
                <ItemContract
                  hasEvents={targetContract.events.abiFragments.length > 0}
                  hasFunctions={targetContract.functions.abiFragments.length >
                    0}
                  targetContractName={targetContract.name}
                  targetContractHref={rootPath +
                    `/${getProjectVersionNameForUrl(
                      targetProject.name,
                      targetVersion.name
                    )}/contracts/${targetContract.name}#${convertToKebabCase(
                      tabValuesForContract[0]
                    )}`}
                />
              {/each}
            </svelte:fragment>
          </BaseAccordion>
        </div>
      </BaseAccordion>
    </div>
  {/each}
{/each}
<!-- <BaseItem
  iconName={undefined}
  label={directoryItems.blocknumberAndDatetime.label}
  size={sizeSettings.leftSidebarTreeTop}
  href={`${rootPath}/${directoryItems.blocknumberAndDatetime.path}`}
/> -->
