import type { Project } from "@constants/chains/types";
import { version as turbo } from "./turbo/_index";

export const project: Project = {
  name: "Augur",
  versions: [turbo],
};
