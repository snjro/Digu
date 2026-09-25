import type { Contract } from "@constants/chains/types";

export type AbiFragmentsType = keyof Pick<Contract, "events" | "functions">;
