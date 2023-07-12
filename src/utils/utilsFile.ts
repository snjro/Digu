// type DownloadDataType = "csv" | "json" | "text";
type MimeType = "text/csv" | "application/json" | "text/plain";
type FileExtension = ".csv" | ".json" | ".txt";
type DataType = { mimeType: MimeType; fileExtension: FileExtension };
const dataTypes: {
  csv: DataType;
  json: DataType;
  text: DataType;
} = {
  csv: {
    mimeType: "text/csv",
    fileExtension: ".csv",
  },
  json: {
    mimeType: "application/json",
    fileExtension: ".json",
  },
  text: {
    mimeType: "text/plain",
    fileExtension: ".txt",
  },
};
type DataTypeKey = keyof typeof dataTypes;
export function downloadDataToFile(
  data: string,
  fileNameWithoutExtension: string,
  dataTypeKey: DataTypeKey
): void {
  let file: Blob = new Blob([data], {
    type: dataTypes[dataTypeKey].mimeType,
  });
  let anchorElement: HTMLAnchorElement = document.createElement("a");
  const url: string = URL.createObjectURL(file);
  const fileExtension: FileExtension = dataTypes[dataTypeKey].fileExtension;
  anchorElement.href = url;
  anchorElement.download = fileNameWithoutExtension + fileExtension;
  document.body.appendChild(anchorElement);
  anchorElement.click();
  setTimeout(() => {
    document.body.removeChild(anchorElement);
    window.URL.revokeObjectURL(url);
  }, 0);
}
