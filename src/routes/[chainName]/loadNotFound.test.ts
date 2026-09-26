import { describe, expect, test } from "vitest";
import { isHttpError, type LoadEvent } from "@sveltejs/kit";
import { load as loadChain } from "./+page";
import { load as loadVersion } from "./[projectName_versionName]/+page";
import { load as loadContracts } from "./[projectName_versionName]/contracts/+page";
import { load as loadContract } from "./[projectName_versionName]/contracts/[contractName]/+page";
import { load as loadEvents } from "./[projectName_versionName]/contracts/[contractName]/events/+page";
import { load as loadEvent } from "./[projectName_versionName]/contracts/[contractName]/events/[eventName]/+page";
import { load as loadFunctions } from "./[projectName_versionName]/contracts/[contractName]/functions/+page";
import { load as loadFunction } from "./[projectName_versionName]/contracts/[contractName]/functions/[functionName]/+page";
import { getTargetContract } from "@utils/utilsDb";

type Params = LoadEvent["params"];

const validParams = {
  chainName: "eth",
  projectName_versionName: "Augur-version1",
  contractName: "Augur",
  eventName: "MarketCreated",
  functionName: `disputeCrowdsourcerCreated-${
    getTargetContract({
      chainName: "eth",
      projectName: "Augur",
      versionName: "version1",
      contractName: "Augur",
    }).functions.abiFragments.find(
      (abiFragment) => abiFragment.name === "disputeCrowdsourcerCreated",
    )!.selector
  }`,
} satisfies Params;

async function expect404(load: () => unknown, message: string): Promise<void> {
  let actual: unknown;
  try {
    await load();
  } catch (e) {
    actual = e;
  }
  expect(isHttpError(actual, 404)).toBe(true);
  expect(isHttpError(actual) && actual.body.message).toBe(message);
}

const loads: {
  route: string;
  load: (params: Params) => unknown;
  notFound: { params: Params; message: string }[];
}[] = [
  {
    route: "[chainName]",
    load: (params) => loadChain({ params }),
    notFound: [
      {
        params: { ...validParams, chainName: "foo" },
        message: "chain not found: foo",
      },
    ],
  },
  {
    route: "[projectName_versionName]",
    load: (params) => loadVersion({ params }),
    notFound: [
      {
        params: { ...validParams, projectName_versionName: "foo-version1" },
        message: "project not found: eth/foo",
      },
      {
        params: { ...validParams, projectName_versionName: "Augur-foo" },
        message: "version not found: eth/Augur/foo",
      },
      {
        // no hyphen: the version name is undefined
        params: { ...validParams, projectName_versionName: "Augur" },
        message: "version not found: eth/Augur/",
      },
    ],
  },
  {
    route: "contracts",
    load: (params) => loadContracts({ params }),
    notFound: [
      {
        params: { ...validParams, projectName_versionName: "Augur-foo" },
        message: "version not found: eth/Augur/foo",
      },
    ],
  },
  {
    route: "[contractName]",
    load: (params) => loadContract({ params }),
    notFound: [
      {
        params: { ...validParams, contractName: "foo" },
        message: "contract not found: eth/Augur/version1/foo",
      },
      {
        // the 404 from the version load passes through as it is
        params: { ...validParams, projectName_versionName: "Augur-foo" },
        message: "version not found: eth/Augur/foo",
      },
    ],
  },
  {
    route: "events",
    load: (params) => loadEvents({ params }),
    notFound: [
      {
        params: { ...validParams, contractName: "foo" },
        message: "contract not found: eth/Augur/version1/foo",
      },
    ],
  },
  {
    route: "[eventName]",
    load: (params) => loadEvent({ params }),
    notFound: [
      {
        params: { ...validParams, eventName: "foo" },
        message: "event not found: eth/Augur/version1/Augur/foo",
      },
      {
        params: { ...validParams, chainName: "foo" },
        message: "chain not found: foo",
      },
    ],
  },
  {
    route: "functions",
    load: (params) => loadFunctions({ params }),
    notFound: [
      {
        params: { ...validParams, contractName: "foo" },
        message: "contract not found: eth/Augur/version1/foo",
      },
    ],
  },
  {
    route: "[functionName]",
    load: (params) => loadFunction({ params }),
    notFound: [
      {
        params: {
          ...validParams,
          functionName: "disputeCrowdsourcerCreated-0x00000000",
        },
        message:
          "function not found: eth/Augur/version1/Augur/disputeCrowdsourcerCreated/0x00000000",
      },
      {
        params: { ...validParams, functionName: "disputeCrowdsourcerCreated" },
        message:
          "function not found: eth/Augur/version1/Augur/disputeCrowdsourcerCreated/",
      },
      {
        params: { ...validParams, contractName: "foo" },
        message: "contract not found: eth/Augur/version1/foo",
      },
    ],
  },
];

describe.each(loads)("load of $route", ({ load, notFound }) => {
  test("should not throw with valid params", async () => {
    expect(await load(validParams)).toMatchObject({
      targetChain: { name: validParams.chainName },
    });
  });
  test.each(notFound)(
    "should throw 404 ($message)",
    async ({ params, message }) => {
      await expect404(() => load(params), message);
    },
  );
});
