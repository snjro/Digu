<script lang="ts">
  import type { ChainName } from "@constants/chains/types";
  import { storeUserSettings } from "@stores/storeUserSettings";
  import { getTargetChain } from "@utils/utlisDb";
  import {
    getProjectVersionNameForLabel,
    getProjectVersionNameForUrl,
  } from "@routes/[chainName]/[projectName_versionName]/projectVersionNameHelper";
  import ItemProjectVersionsMember from "./ItemProjectVersionsMember.svelte";

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
    <ItemProjectVersionsMember
      targetProjectVersionNameForLabel={getProjectVersionNameForLabel(
        targetProject.name,
        targetVersion.name
      )}
      targetProjectVersionHref={`${rootPath}/${getProjectVersionNameForUrl(
        targetProject.name,
        targetVersion.name
      )}`}
      targetContracts={targetVersion.contracts}
    />
  {/each}
{/each}
