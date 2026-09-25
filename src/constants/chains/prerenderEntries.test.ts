// svelte.config.js fails to load under happy-dom, whose URL has no file scheme.
// @vitest-environment node
import { describe, expect, test } from "vitest";
import config from "../../../svelte.config.js";
import { TARGET_CHAINS } from "./_index";
import { getAbiFragmentHref } from "$lib/leftSidebar/Body/functionNameHandler";
import {
  DIR_NAME_CONTRACTS,
  DIR_NAME_EVENTS,
  DIR_NAME_FUNCTIONS,
} from "@utils/utilsConstants";

// ssr is false, so the prerender does not crawl links. Every page that must
// open directly needs its own entry.
function getExpectedEntries(): string[] {
  const entries: string[] = ["/"];
  for (const targetChain of TARGET_CHAINS) {
    const chainEntry = `/${targetChain.name}`;
    entries.push(chainEntry);
    for (const targetProject of targetChain.projects) {
      for (const targetVersion of targetProject.versions) {
        const versionEntry = `${chainEntry}/${targetProject.name}-${targetVersion.name}`;
        entries.push(versionEntry, `${versionEntry}/${DIR_NAME_CONTRACTS}`);
        for (const targetContract of targetVersion.contracts) {
          const contractEntry = `${versionEntry}/${DIR_NAME_CONTRACTS}/${targetContract.name}`;
          entries.push(contractEntry);
          // abiFragments, not names: anonymous events are linked too.
          for (const dirName of [
            DIR_NAME_EVENTS,
            DIR_NAME_FUNCTIONS,
          ] as const) {
            const abiFragments = targetContract[dirName].abiFragments;
            if (abiFragments.length === 0) continue;
            const dirEntry = `${contractEntry}/${dirName}`;
            entries.push(dirEntry);
            for (const abiFragment of abiFragments) {
              entries.push(getAbiFragmentHref(dirEntry, abiFragment));
            }
          }
        }
      }
    }
  }
  return [...new Set(entries)].sort();
}

describe("prerender entries in svelte.config.js", () => {
  const actualEntries: string[] = config.kit?.prerender?.entries ?? [];
  const expectedEntries: string[] = getExpectedEntries();

  test("has no duplicates", () => {
    expect(actualEntries.length).toBe(new Set(actualEntries).size);
  });
  test("has no entries missing from TARGET_CHAINS", () => {
    const missing = expectedEntries.filter((e) => !actualEntries.includes(e));
    expect(missing).toEqual([]);
  });
  test("has no entries that TARGET_CHAINS does not have", () => {
    const extra = actualEntries.filter((e) => !expectedEntries.includes(e));
    expect(extra).toEqual([]);
  });
});
