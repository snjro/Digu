import type { ProjectName, VersionName } from "@constants/chains/types";

export function getProjectVersionNameForUrl(
  projectName: ProjectName,
  versionName: VersionName,
): string {
  return `${projectName}-${versionName}`;
}
export function getProjectVersionNameForLabel(
  projectName: ProjectName,
  versionName: VersionName,
): string {
  return `${projectName} ${versionName}`;
}

export function getSplitProjectVersionName(projectVersionName: string): {
  projectName: ProjectName;
  versionName: VersionName;
} {
  return {
    projectName: projectVersionName.split("-")[0],
    versionName: projectVersionName.split("-")[1],
  };
}
