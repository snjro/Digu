import { EventFragment, FunctionFragment, Interface } from "ethers";
import { describe, expect, test } from "vitest";
import type { AbiFormatType } from "@utils/utilsEthers";
import {
  formatTargetAbi,
  getAbiExportTooltipText,
  getAbiFileExtension,
  getAbiText,
  isTargetContractInterface,
} from "./abiText";

const EVENT_SIGNATURE =
  "event Transfer(address indexed from, address to, uint256 value)";
const FUNCTION_SIGNATURE =
  "function balanceOf(address owner) view returns (uint256)";

const contractInterface = new Interface([EVENT_SIGNATURE, FUNCTION_SIGNATURE]);
const eventFragment = EventFragment.from(EVENT_SIGNATURE);
const functionFragment = FunctionFragment.from(FUNCTION_SIGNATURE);
const tupleFragment = FunctionFragment.from(
  "function setOrder((address maker, uint256[2] amounts)[] orders)",
);

const TRANSFER_JSON = {
  type: "event",
  anonymous: false,
  name: "Transfer",
  inputs: [
    // A human readable ABI leaves "indexed" out when it is not indexed.
    { type: "address", name: "from", indexed: true },
    { type: "address", name: "to" },
    { type: "uint256", name: "value" },
  ],
};
const BALANCE_OF_JSON = {
  type: "function",
  name: "balanceOf",
  constant: true,
  stateMutability: "view",
  payable: false,
  inputs: [{ type: "address", name: "owner" }],
  outputs: [{ type: "uint256", name: "" }],
};

describe("isTargetContractInterface", () => {
  test("returns true for a contract interface", () => {
    expect(isTargetContractInterface(contractInterface)).toBe(true);
  });
  test.each([
    ["event", eventFragment],
    ["function", functionFragment],
  ])("returns false for a %s fragment", (_, fragment) => {
    expect(isTargetContractInterface(fragment)).toBe(false);
  });
});

describe("formatTargetAbi", () => {
  describe("contract interface", () => {
    test("json: returns the standard ABI JSON", () => {
      expect(formatTargetAbi(contractInterface, "json")).toStrictEqual([
        TRANSFER_JSON,
        BALANCE_OF_JSON,
      ]);
    });
    test("json: gives a non-payable constructor the stateMutability nonpayable", () => {
      const withConstructor = new Interface(["constructor(address owner)"]);
      const withPayableConstructor = new Interface([
        "constructor(address owner) payable",
      ]);
      expect(formatTargetAbi(withConstructor, "json")).toStrictEqual([
        {
          type: "constructor",
          stateMutability: "nonpayable",
          payable: false,
          inputs: [{ type: "address", name: "owner" }],
        },
      ]);
      expect(formatTargetAbi(withPayableConstructor, "json")).toStrictEqual([
        {
          type: "constructor",
          stateMutability: "payable",
          payable: true,
          inputs: [{ type: "address", name: "owner" }],
        },
      ]);
    });
    test("full: returns the full human readable ABI", () => {
      expect(formatTargetAbi(contractInterface, "full")).toEqual([
        "event Transfer(address indexed from, address to, uint256 value)",
        "function balanceOf(address owner) view returns (uint256)",
      ]);
    });
    test("minimal: returns the minimal human readable ABI", () => {
      expect(formatTargetAbi(contractInterface, "minimal")).toEqual([
        "event Transfer(address indexed,address,uint256)",
        "function balanceOf(address) view returns (uint256)",
      ]);
    });
  });

  describe("fragment", () => {
    test("json: returns the standard ABI JSON", () => {
      expect(formatTargetAbi(eventFragment, "json")).toStrictEqual(
        TRANSFER_JSON,
      );
      expect(formatTargetAbi(functionFragment, "json")).toStrictEqual(
        BALANCE_OF_JSON,
      );
    });
    test("json: has no fields that only ethers has", () => {
      const abiText: string = getAbiText(tupleFragment, "json", false);
      for (const key of ["baseType", "arrayLength", "arrayChildren", "gas"]) {
        expect(abiText).not.toContain(`"${key}"`);
      }
      expect(abiText).not.toContain("null");
      expect(JSON.parse(abiText)).toStrictEqual({
        type: "function",
        name: "setOrder",
        constant: false,
        payable: false,
        inputs: [
          {
            type: "tuple[]",
            name: "orders",
            components: [
              { type: "address", name: "maker" },
              { type: "uint256[2]", name: "amounts" },
            ],
          },
        ],
        outputs: [],
      });
    });
    test("full: returns the full human readable fragment", () => {
      expect(formatTargetAbi(eventFragment, "full")).toBe(
        "event Transfer(address indexed from, address to, uint256 value)",
      );
      expect(formatTargetAbi(functionFragment, "full")).toBe(
        "function balanceOf(address owner) view returns (uint256)",
      );
    });
    test("minimal: returns the minimal human readable fragment", () => {
      expect(formatTargetAbi(eventFragment, "minimal")).toBe(
        "event Transfer(address indexed,address,uint256)",
      );
      expect(formatTargetAbi(functionFragment, "minimal")).toBe(
        "function balanceOf(address) view returns (uint256)",
      );
    });
  });
});

describe("getAbiText", () => {
  test("expanded: indents with 2 spaces", () => {
    expect(getAbiText(contractInterface, "full", true)).toBe(
      [
        "[",
        '  "event Transfer(address indexed from, address to, uint256 value)",',
        '  "function balanceOf(address owner) view returns (uint256)"',
        "]",
      ].join("\n"),
    );
  });
  test("not expanded: has no line breaks", () => {
    expect(getAbiText(contractInterface, "full", false)).toBe(
      '["event Transfer(address indexed from, address to, uint256 value)","function balanceOf(address owner) view returns (uint256)"]',
    );
  });
  test("minimal fragment is a JSON string", () => {
    expect(getAbiText(functionFragment, "minimal", false)).toBe(
      '"function balanceOf(address) view returns (uint256)"',
    );
  });
  test("JSON of a fragment has its type and name", () => {
    const abiText: string = getAbiText(eventFragment, "json", false);
    expect(abiText).not.toContain("\n");
    expect(JSON.parse(abiText)).toMatchObject({
      type: "event",
      name: "Transfer",
    });
  });
  test("JSON of a contract interface is the list of fragments", () => {
    const abiText: string = getAbiText(contractInterface, "json", true);
    expect(abiText).toContain("\n");
    expect(JSON.parse(abiText)).toMatchObject([
      { type: "event", name: "Transfer" },
      { type: "function", name: "balanceOf" },
    ]);
  });
});

describe("getAbiFileExtension", () => {
  test("returns json for the JSON format", () => {
    expect(getAbiFileExtension("json")).toBe("json");
  });
  test.each<AbiFormatType>(["full", "minimal"])(
    "returns txt for the human readable format %s",
    (abiFormat) => {
      expect(getAbiFileExtension(abiFormat)).toBe("txt");
    },
  );
});

describe("getAbiExportTooltipText", () => {
  test("returns Export as JSON for the JSON format", () => {
    expect(getAbiExportTooltipText("json")).toBe("Export as JSON");
  });
  test.each<AbiFormatType>(["full", "minimal"])(
    "returns Export as text for the human readable format %s",
    (abiFormat) => {
      expect(getAbiExportTooltipText(abiFormat)).toBe("Export as text");
    },
  );
});
