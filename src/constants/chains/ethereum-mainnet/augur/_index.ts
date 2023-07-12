import type { Project } from "@constants/chains/types";
import { version as version1 } from "./version1/_index";
import { version as version2 } from "./version2/_index";

export const project: Project = {
  name: "Augur",
  versions: [version1, version2],
  // versions: [version1],
};
