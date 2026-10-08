<script lang="ts">
  import { colorClasses } from "#lib/appearanceConfig/color/colorVariables.js";
  import BaseA from "#lib/base/BaseA.svelte";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import { storeChainActivity } from "#eventLogs/chainActivity.js";
  import { storeChainStatus } from "#stores/storeChainStatus.js";
  import { storeRpcSettings } from "#stores/storeRpcSettings.js";
  import { storeSyncStatus } from "#stores/storeSyncStatus.js";
  import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import classNames from "classnames";
  import { getRpcInputHelperLabelProps } from "./rpcInputHelperLabel";
  import { getShownSyncStoppedReason } from "./syncStatus/syncPanel";

  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let nodeStatus = $derived($storeChainStatus[targetChainName].nodeStatus);
  let rpc = $derived($storeRpcSettings[targetChainName].rpc);
  let syncStoppedReason = $derived(
    getShownSyncStoppedReason(
      $storeChainActivity[targetChainName],
      $storeSyncStatus[targetChainName].syncStateText,
      $storeSyncStoppedReason[targetChainName],
    ),
  );

  let { helpHref, ...helperLabelProps } = $derived(
    getRpcInputHelperLabelProps(nodeStatus, rpc, syncStoppedReason),
  );
  // The blur of the input starts a check. Keep the link while it runs, so a
  // click on the link that takes the focus from the input opens it (#650).
  let shownHelpHref: string | undefined = $state();
  $effect.pre(() => {
    if (nodeStatus !== "CONNECTING") {
      shownHelpHref = helpHref;
    }
  });
</script>

<div class={classNames("ml-2")}>
  <!-- The link is in the label, to follow the text when the text wraps. inline-flex
  leaves out the spaces of the template of BaseA. -->
  <BaseLabel {...helperLabelProps}>
    {#if shownHelpHref}
      <BaseA
        href={shownHelpHref}
        textSize={helperLabelProps.textSize}
        appendClass={classNames(
          "inline-flex",
          "ml-1",
          "underline",
          // The usual link color is too light on the nav (#639).
          colorClasses.interactive.textEmphasis,
        )}
        openNewTab
      >
        {#snippet anchorContent()}How to get one{/snippet}
      </BaseA>
    {/if}
  </BaseLabel>
</div>
