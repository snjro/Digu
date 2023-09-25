import type { JsonFileContract } from "@constants/chains/jsonFileTypes";

const jsonFileContract1EventOnly: JsonFileContract = {
  name: "contractName1",
  address: "0x11",
  creation: {
    tx: "0x12",
    blockNumber: 1,
    timestamp: 1,
    creator: "0x13",
  },
  abi: [
    {
      name: "event1",
      type: "event",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};
const jsonFileContract2FunctionOnly: JsonFileContract = {
  name: "contractName2",
  address: "0x21",
  creation: {
    tx: "0x22",
    blockNumber: 2,
    timestamp: 2,
    creator: "0x23",
  },
  abi: [
    {
      name: "function1",
      type: "function",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};
const jsonFileContract3FunctionOnly: JsonFileContract = {
  name: "contractName3",
  address: "0x31",
  creation: {
    tx: "0x32",
    blockNumber: 3,
    timestamp: 3,
    creator: "0x33",
  },
  abi: [
    {
      name: "function1",
      type: "function",
      inputs: [{ name: "param1", type: "address" }],
    },
  ],
};

export const jsonFileContracts: JsonFileContract[] = [
  jsonFileContract1EventOnly,
  jsonFileContract2FunctionOnly,
  jsonFileContract3FunctionOnly,
];
