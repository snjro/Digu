<script lang="ts">
  import BaseA from "#lib/base/BaseA.svelte";
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import { storeChainStatus } from "#stores/storeChainStatus.js";
  import { storeRpcSettings } from "#stores/storeRpcSettings.js";
  import { storeSyncStoppedReason } from "#stores/storeSyncStoppedReason.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import classNames from "classnames";
  import { getRpcInputHelperLabelProps } from "./rpcInputHelperLabel";

  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let nodeStatus = $derived($storeChainStatus[targetChainName].nodeStatus);
  let rpc = $derived($storeRpcSettings[targetChainName].rpc);
  let syncStoppedReason = $derived($storeSyncStoppedReason[targetChainName]);

  let { helpHref, ...helperLabelProps } = $derived(
    getRpcInputHelperLabelProps(nodeStatus, rpc, syncStoppedReason),
  );
</script>

<div class={classNames("ml-2")}>
  <!-- The link is in the label, to follow the text when the text wraps. inline-flex
  leaves out the spaces of the template of BaseA. -->
  <BaseLabel {...helperLabelProps}>
    {#if helpHref}
      <BaseA
        href={helpHref}
        textSize={helperLabelProps.textSize}
        appendClass={classNames("inline-flex", "ml-1", "underline")}
        openNewTab
      >
        {#snippet anchorContent()}How to get one{/snippet}
      </BaseA>
    {/if}
  </BaseLabel>
</div>
