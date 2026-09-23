import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import {
  ExportDataToFile,
  getExportFileName,
  type ExportFilePrefix,
} from "./utilsFile";

type ExportFileExtention = "csv" | "json" | "txt";

beforeAll(() => {
  // Mocking system time
  const testMilliSeconds = 1466424490000; // 2016-06-20T12:08:10Z
  vi.useFakeTimers();
  vi.setSystemTime(testMilliSeconds);
});

afterAll(() => {
  vi.useRealTimers();
});
describe("ExportDataToFile", () => {
  const createElementMock = vi.fn();
  const appendChildMock = vi.fn();
  const removeChildMock = vi.fn();
  const clickMock = vi.fn();
  const createObjectURLMock = vi.fn();
  const revokeObjectURLMock = vi.fn();
  const dummyUrl: string = "blob:dummy";
  let anchorElement: {
    href: string;
    download: string;
    click: typeof clickMock;
  };

  beforeEach(() => {
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;
    document.createElement = createElementMock;
    document.body.appendChild = appendChildMock;
    document.body.removeChild = removeChildMock;

    anchorElement = { href: "", download: "", click: clickMock };
    createElementMock.mockReturnValue(anchorElement);
    createObjectURLMock.mockReturnValue(dummyUrl);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  test("should create a file with the correct data and trigger a download", async () => {
    const targetData: string = "Hello, world!";
    const exportFileName: `${ExportFilePrefix}${string}${ExportFileExtention}` =
      "contracts.txt";
    const extention: ExportFileExtention = "txt";

    ExportDataToFile(targetData, exportFileName, extention);

    // check the file
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const blob: Blob = createObjectURLMock.mock.calls[0][0];
    expect(blob.type).toBe("text/plain");
    expect(await blob.text()).toBe(targetData);
    // check the download link
    expect(createElementMock).toHaveBeenCalledWith("a");
    expect(anchorElement.href).toBe(dummyUrl);
    expect(anchorElement.download).toBe(exportFileName);
    expect(appendChildMock).toHaveBeenCalledWith(anchorElement);
    expect(clickMock).toHaveBeenCalledTimes(1);
    // the link is removed after the timer
    expect(removeChildMock).not.toHaveBeenCalled();
    expect(revokeObjectURLMock).not.toHaveBeenCalled();

    // Advancing all timers immediately
    vi.runAllTimers();

    expect(removeChildMock).toHaveBeenCalledWith(anchorElement);
    expect(revokeObjectURLMock).toHaveBeenCalledWith(dummyUrl);
  });
});

describe("getExportFileName", () => {
  const prefix: ExportFilePrefix = "contracts";
  const extention: ExportFileExtention = "json";

  test("should generate a file name based on the max provided parameters", () => {
    const pageParams: Record<string, string> = {
      chainName: "Ethereum",
      projectName_versionName: "MyProject_v1",
      contractName: "MyContract",
      eventName: "MyEvent",
      functionName: "MyFunction",
    };
    const actualFileName = getExportFileName(prefix, pageParams, extention);
    const expectedFileName = `${prefix}-Ethereum-MyProject_v1-MyContract-MyEvent-MyFunction-2016-06-20T12:08:10Z.${extention}`;
    expect(actualFileName).toBe(expectedFileName);
  });
  test("should generate a file name based on the min provided parameters", () => {
    const pageParams: Record<string, string> = {
      chainName: "Ethereum",
    };
    const actualFileName = getExportFileName(prefix, pageParams, extention);
    const expectedFileName = `${prefix}-Ethereum-2016-06-20T12:08:10Z.${extention}`;
    expect(actualFileName).toBe(expectedFileName);
  });
});
