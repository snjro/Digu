import type { EventLogType } from "@routes/[chainName]/[projectName_versionName]/contracts/[contractName]/events/[eventName]/EventLogs.svelte";
import { convertTimestampSecToIso8601 } from "./utilsTime";

export type ExportFilePrefix =
  | "contracts"
  | "events"
  | "functions"
  | `eventLogs(${EventLogType})`
  | "ABI"
  | "ABIfragment";

type MimeType = "text/csv" | "application/json" | "text/plain";
type ExportDataType = { mimeType: MimeType };
const dataTypes: {
  csv: ExportDataType;
  json: ExportDataType;
  text: ExportDataType;
} = {
  csv: {
    mimeType: "text/csv",
  },
  json: {
    mimeType: "application/json",
  },
  text: {
    mimeType: "text/plain",
  },
};
type ExportFileExtention = keyof typeof dataTypes;
export function ExportDataToFile(
  targetData: string,
  exportFileName: ExportFileName,
  extention: ExportFileExtention,
): void {
  let fileLikeObject: Blob = new Blob([targetData], {
    type: dataTypes[extention].mimeType,
  });
  let anchorElement: HTMLAnchorElement = document.createElement("a");
  const url: string = URL.createObjectURL(fileLikeObject);
  anchorElement.href = url;
  anchorElement.download = exportFileName;
  document.body.appendChild(anchorElement);
  anchorElement.click();
  setTimeout(() => {
    document.body.removeChild(anchorElement);
    window.URL.revokeObjectURL(url);
  }, 0);
}

type ExportFileName = `${ExportFilePrefix}${string}${ExportFileExtention}`;

export function getExportFileName(
  prefix: ExportFilePrefix,
  pageParams: Record<string, string>,
  extention: ExportFileExtention,
): ExportFileName {
  const chainFileName: string = getFileNameFragment(pageParams.chainName);
  const projectVersionFileName: string = getFileNameFragment(
    pageParams.projectName_versionName,
  );
  const contractFileName: string = getFileNameFragment(pageParams.contractName);
  const eventFileName: string = getFileNameFragment(pageParams.eventName);
  const functionFileName: string = getFileNameFragment(pageParams.functionName);
  const timeIso8601: string = getFileNameFragment(
    convertTimestampSecToIso8601(),
  );

  const exportFileName: ExportFileName = `${prefix}${chainFileName}${projectVersionFileName}${contractFileName}${eventFileName}${functionFileName}${timeIso8601}.${extention}`;

  return exportFileName;
}

function getFileNameFragment(fileNameFragment: string): string {
  return fileNameFragment ? `-${fileNameFragment}` : "";
}
