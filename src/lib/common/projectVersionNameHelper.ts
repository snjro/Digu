import type { ProjectName, VersionName } from "#constants/chains/types.js";

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
  // All the text after the first hyphen, so that a URL with more hyphens
  // does not match a version.
  const [projectName, ...rest]: string[] = projectVersionName.split("-");
  return { projectName: projectName, versionName: rest.join("-") };
}

export function getProjectVersionNameForLabelFromUrl(
  projectVersionName: string,
): string {
  const splitProjectVersionName: {
    projectName: ProjectName;
    versionName: VersionName;
  } = getSplitProjectVersionName(projectVersionName);
  return getProjectVersionNameForLabel(
    splitProjectVersionName.projectName,
    splitProjectVersionName.versionName,
  );
}
