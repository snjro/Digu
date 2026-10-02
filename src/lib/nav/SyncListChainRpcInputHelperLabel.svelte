<script lang="ts">
  import BaseLabel from "#lib/base/BaseLabel.svelte";
  import { storeChainStatus } from "#stores/storeChainStatus.js";
  import { storeRpcSettings } from "#stores/storeRpcSettings.js";
  import { storeUserSettings } from "#stores/storeUserSettings.js";
  import classNames from "classnames";
  import { getRpcInputHelperLabelProps } from "./rpcInputHelperLabel";

  let targetChainName = $derived(
    $storeUserSettings.selectedChainName.toString(),
  );
  let nodeStatus = $derived($storeChainStatus[targetChainName].nodeStatus);
  let rpc = $derived($storeRpcSettings[targetChainName].rpc);

  let helperLabelProps = $derived(() =>
    getRpcInputHelperLabelProps(nodeStatus, rpc),
  );
</script>

<div class={classNames("ml-2")}>
  <BaseLabel {...helperLabelProps()} />
</div>
