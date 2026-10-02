import type { Contract } from "#constants/chains/types.js";

export type AbiFragmentsType = keyof Pick<Contract, "events" | "functions">;
