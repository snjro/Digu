import type { BaseAProps } from "$lib/base/BaseA.svelte";
import type { ChainExplorer } from "@constants/chains/types";

export type CommonChainExplorerLinkProps = {
  subdirectory: keyof ChainExplorer["subdirectory"];
  value: string | undefined;
  textSize: NonNullable<BaseAProps["textSize"]>;
  forcedClass: BaseAProps["forcedClass"];
  appendClass: BaseAProps["appendClass"];
  withIcon: boolean;
  showCopyButton: boolean;
  isFontMono: boolean;
  justifyEnd: boolean;
};
