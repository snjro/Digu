import { executeTargetFunction } from "./db.worker.executeTargetFunction";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import type { DbWorkerMessage, TargetFunctionName } from "./db.worker.types";

vi.mock("./db.worker.executeTargetFunction");
vi.mock("@utils/logger", () => ({
  customLogger: {
    start: vi.fn(),
  },
}));

type MessageListener = (
  event: MessageEvent<DbWorkerMessage<TargetFunctionName>>,
) => Promise<void>;

describe("db.worker", () => {
  let listener: MessageListener;
  const postMessage = vi.fn();

  beforeAll(async () => {
    const addEventListener = vi.spyOn(self, "addEventListener");
    vi.stubGlobal("postMessage", postMessage);
    await import("./db.worker");
    listener = addEventListener.mock.calls.find(
      ([type]) => type === "message",
    )?.[1] as unknown as MessageListener;
    addEventListener.mockRestore();
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function send(): Promise<void> {
    return listener({
      data: { targetFunctionName: "initializeDbSettings", params: undefined },
    } as MessageEvent<DbWorkerMessage<TargetFunctionName>>);
  }

  test("should post the value", async () => {
    vi.mocked(executeTargetFunction).mockResolvedValueOnce(undefined);

    await send();

    expect(postMessage).toHaveBeenCalledWith({
      log: "DbWorker: initializeDbSettings",
      value: undefined,
    });
  });

  test("should post the error message when the function throws", async () => {
    vi.mocked(executeTargetFunction).mockRejectedValueOnce(
      new Error("test error"),
    );

    await send();

    expect(postMessage).toHaveBeenCalledWith({
      log: "DbWorker: initializeDbSettings",
      error: "test error",
    });
  });
});
