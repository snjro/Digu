// loadChain reads the _index.ts files with regular expressions. It must find
// the same contracts with events as the app.
import { expect, test } from "vitest";
import { TARGET_CHAINS } from "../../src/constants/chains/_index.ts";
import { loadChain } from "./chains.mjs";

const byKey = (a, b) =>
  `${a.project}/${a.version}/${a.name}`.localeCompare(
    `${b.project}/${b.version}/${b.name}`,
  );

test.each(TARGET_CHAINS.map((chain) => [chain.name, chain]))(
  "loadChain(%s) has the chain and the contracts with events of the app",
  (name, app) => {
    const chain = loadChain(name);
    expect({
      name: chain.name,
      chainId: chain.chainId,
      confirmationBlocks: chain.confirmationBlocks,
      contracts: chain.contracts
        .map(({ project, version, name, address, creationBlock }) => ({
          project,
          version,
          name,
          address,
          creationBlock,
        }))
        .sort(byKey),
    }).toEqual({
      name: app.name,
      chainId: app.chainId,
      confirmationBlocks: app.confirmationBlocks,
      contracts: app.projects
        .flatMap((project) =>
          project.versions.flatMap((version) =>
            version.contracts
              // events.names leaves out the anonymous events, as the sync.
              .filter((contract) => contract.events.names.length > 0)
              .map((contract) => ({
                project: project.name,
                version: version.name,
                name: contract.name,
                address: contract.address,
                creationBlock: contract.creation.blockNumber,
              })),
          ),
        )
        .sort(byKey),
    });
  },
);
