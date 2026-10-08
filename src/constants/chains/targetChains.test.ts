import { describe, expect, test } from "vitest";
import { isHexString } from "ethers";
import { TARGET_CHAINS } from "./_index";

// The contract JSON files are cast with `as JsonFileContract[]`, which does not
// catch a wrong field in one of them. Check every contract here instead.
const contracts = TARGET_CHAINS.flatMap((targetChain) =>
  targetChain.projects.flatMap((targetProject) =>
    targetProject.versions.flatMap((targetVersion) =>
      targetVersion.contracts.map(
        (targetContract) =>
          [
            `${targetChain.name}/${targetProject.name}-${targetVersion.name}/${targetContract.name}`,
            targetContract,
          ] as const,
      ),
    ),
  ),
);
const versions = TARGET_CHAINS.flatMap((targetChain) =>
  targetChain.projects.flatMap((targetProject) =>
    targetProject.versions.map(
      (targetVersion) =>
        [
          `${targetChain.name}/${targetProject.name}-${targetVersion.name}`,
          targetVersion,
        ] as const,
    ),
  ),
);
function duplicatesOf(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}
const ABI_FRAGMENT_TYPES = [
  "constructor",
  "function",
  "event",
  "error",
  "fallback",
];

describe("TARGET_CHAINS", () => {
  test("has contracts", () => {
    expect(contracts.length).toBeGreaterThan(0);
  });
  describe.each(contracts)("%s", (_, targetContract) => {
    test("address", () => {
      expect(isHexString(targetContract.address, 20)).toBe(true);
    });
    test("creation", () => {
      const { tx, blockNumber, timestamp, creator } = targetContract.creation;
      expect(isHexString(tx, 32)).toBe(true);
      expect(Number.isInteger(blockNumber) && blockNumber > 0).toBe(true);
      expect(Number.isInteger(timestamp) && timestamp > 0).toBe(true);
      expect(isHexString(creator, 20)).toBe(true);
    });
  });
  // The URL, the table names and the store use the contract name as the key.
  describe.each(versions)("%s", (_, targetVersion) => {
    test("contract names are unique", () => {
      const names = targetVersion.contracts.map(
        (targetContract) => targetContract.name,
      );
      expect(duplicatesOf(names)).toEqual([]);
    });
  });
  // Two contracts of one address would save the same logs in two tables.
  describe.each(
    TARGET_CHAINS.map(
      (targetChain) => [targetChain.name, targetChain] as const,
    ),
  )("%s", (_, targetChain) => {
    test("contract addresses are unique", () => {
      const addresses = targetChain.projects.flatMap((targetProject) =>
        targetProject.versions.flatMap((targetVersion) =>
          targetVersion.contracts.map((targetContract) =>
            targetContract.address.toLowerCase(),
          ),
        ),
      );
      expect(duplicatesOf(addresses)).toEqual([]);
    });
  });
});

// ethers.Interface skips an ABI entry it cannot read, so check the JSON files.
const jsonFiles = Object.entries(
  import.meta.glob<{ abi: unknown; name: unknown }>("./**/*.json", {
    eager: true,
    import: "default",
  }),
);

describe("contract JSON files", () => {
  test("one for each contract", () => {
    expect(jsonFiles.length).toBe(contracts.length);
  });
  describe.each(jsonFiles)("%s", (jsonPath, jsonFile) => {
    test("name is the file name", () => {
      expect(jsonFile.name).toBe(
        jsonPath.split("/").at(-1)?.slice(0, -".json".length),
      );
    });
    test("abi", () => {
      // Order of Augur version1 has an empty ABI.
      expect(Array.isArray(jsonFile.abi)).toBe(true);
      for (const abiFragment of jsonFile.abi as { type: unknown }[]) {
        expect(ABI_FRAGMENT_TYPES).toContain(abiFragment.type);
      }
    });
  });
});
