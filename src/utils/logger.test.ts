import { type SpyInstance, expect, test, vi, describe } from "vitest";
import { customLogger } from "./logger";
type LogLevel =
  | "  info  "
  | " start  "
  | "finished"
  | "success "
  | "  fail  "
  | " error  "
  | " fatal  "
  | "  warn  "
  | " debug  ";
type LogDefinition = {
  logLevel: LogLevel;
  method: (...messages: any[]) => void;
};
const messages: any[] = ["test"];
const logDefinitions: LogDefinition[] = [
  { logLevel: "  info  ", method: customLogger.info },
  { logLevel: " start  ", method: customLogger.start },
  { logLevel: "finished", method: customLogger.finished },
  { logLevel: "success ", method: customLogger.success },
  { logLevel: "  fail  ", method: customLogger.fail },
  { logLevel: " error  ", method: customLogger.error },
  { logLevel: " fatal  ", method: customLogger.fatal },
  { logLevel: "  warn  ", method: customLogger.warn },
  { logLevel: " debug  ", method: customLogger.debug },
];

function getConsoleSpy(targetLogLevel: LogLevel): SpyInstance {
  switch (targetLogLevel) {
    case "  info  ":
    case " start  ":
    case "finished":
    case "success ":
    case "  fail  ":
      return vi.spyOn(console, "log").mockImplementation(() => undefined);
    case " error  ":
    case " fatal  ":
      return vi.spyOn(console, "error").mockImplementation(() => undefined);
    case "  warn  ":
      return vi.spyOn(console, "warn").mockImplementation(() => undefined);
    case " debug  ":
      return vi.spyOn(console, "debug").mockImplementation(() => undefined);
  }
}
describe("customLogger", () => {
  test.each<LogDefinition>(logDefinitions)(
    `should log messages with the level "$logLevel"`,
    ({
      logLevel,
      method,
    }: {
      logLevel: LogLevel;
      method: LogDefinition["method"];
    }) => {
      let consoleSpy: SpyInstance = getConsoleSpy(logLevel);
      method(...messages);
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toBeCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        ...messages,
      );
      consoleSpy.mockReset();
    },
  );
});
