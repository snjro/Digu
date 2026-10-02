<script lang="ts">
  import { basePath } from "#lib/common/basePath.js";
  import { getChainRootUrl } from "#lib/common/chainRootUrl.js";
  import type { ChainName } from "#constants/chains/types.js";
  import {
    getProjectVersionNameForLabel,
    getProjectVersionNameForUrl,
  } from "#lib/common/projectVersionNameHelper.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import { getTargetChain } from "#utils/utilsDb.js";
  import ItemProjectVersionsMember from "./ItemProjectVersionsMember.svelte";

  let chainName: ChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );

  let rootPath: string = $derived(getChainRootUrl(basePath, chainName));

  let targetChain = $derived(
    getTargetChain({
      chainName: chainName,
    }),
  );
</script>

{#each targetChain.projects as targetProject (targetProject.name)}
  {#each targetProject.versions as targetVersion (targetVersion.name)}
    <ItemProjectVersionsMember
      targetProjectVersionNameForLabel={getProjectVersionNameForLabel(
        targetProject.name,
        targetVersion.name,
      )}
      targetProjectVersionHref={`${rootPath}/${getProjectVersionNameForUrl(
        targetProject.name,
        targetVersion.name,
      )}`}
      targetContracts={targetVersion.contracts}
    />
  {/each}
{/each}
