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

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(); // Mocking URL.createObjectURL
    document.createElement = createElementMock;
    document.body.appendChild = appendChildMock;
    document.body.removeChild = removeChildMock;

    createElementMock.mockReturnValue({
      href: "",
      download: "",
      click: clickMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  test("should create a file with the correct data and trigger a download", () => {
    const targetData: string = "Hello, world!";
    const exportFileName: `${ExportFilePrefix}${string}${ExportFileExtention}` =
      "contracts.txt";
    const extention: ExportFileExtention = "txt";

    ExportDataToFile(targetData, exportFileName, extention);

    // Advancing all timers immediately
    vi.runAllTimers();

    expect(createElementMock).toHaveBeenCalledWith("a");
    expect(appendChildMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
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
