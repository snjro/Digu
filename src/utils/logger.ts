/* eslint @typescript-eslint/no-explicit-any: 0 */
import { convertTimestampSecToIso8601 } from "./utilsTime";
export class customLogger {
  static info(...messages: any[]) {
    logBase("info", messages);
  }
  static start(...messages: any[]) {
    logBase("start", messages);
  }
  static finished(...messages: any[]) {
    logBase("finished", messages);
  }
  static success(...messages: any[]) {
    logBase("success", messages);
  }
  static fail(...messages: any[]) {
    logBase("fail", messages);
  }
  static error(...messages: any[]) {
    logBase("error", messages);
  }
  static fatal(...messages: any[]) {
    logBase("fatal", messages);
  }
  static warn(...messages: any[]) {
    logBase("warn", messages);
  }
  static debug(...messages: any[]) {
    logBase("debug", messages);
  }
}

type LogLevel =
  | "info"
  | "start"
  | "finished"
  | "success"
  | "fail"
  | "error"
  | "fatal"
  | "warn"
  | "debug";

const labelBgColor = (logLevel: LogLevel): CssColorKeyword => {
  switch (logLevel) {
    case "info":
      return "white";
    case "start":
      return "skyblue";
    case "finished":
      return "deepskyblue";
    case "success":
      return "limegreen";
    case "fail":
      return "tomato";
    case "error":
      return "orangered";
    case "fatal":
      return "red";
    case "warn":
      return "gold";
    default: //debug
      return "mediumpurple";
  }
};

const logBase = (logLevel: LogLevel, messages: any[]) => {
  const timestamp: string = convertTimestampSecToIso8601();
  const headerLabel: string = `%c${logLevel}%c %c${timestamp}`;

  const cssForLabel = (logLevel: LogLevel): string =>
    convertStringArrayToCssText([
      `background-color:${labelBgColor(logLevel)}`,
      "color:black",
      "padding: 1px 4px",
      "font-family: monospace",
      "font-weight: 700",
      "border-radius: 4px",
      "display: inline-block",
    ]);
  const cssForTime: string = convertStringArrayToCssText([
    "font-family: monospace",
    "color: gray",
  ]);

  const consoleArgs: any = [
    headerLabel,
    cssForLabel(logLevel),
    "",
    cssForTime,
    ...addNewline(messages),
  ];
  switch (logLevel) {
    case "info":
    case "start":
    case "finished":
    case "success":
    case "fail":
      console.log(...consoleArgs);
      break;
    case "error":
    case "fatal":
      console.error(...consoleArgs);
      break;
    case "warn":
      console.warn(...consoleArgs);
      break;
    default:
      console.debug(...consoleArgs);
      break;
  }
};

function convertStringArrayToCssText(arrCss: string[]): string {
  return arrCss.join("; ") + ";";
}
/**
 * This function takes an array of any type as input and returns a new array.
 * For each element in the input array, if the element is a string and not the last element,
 * it appends a newline character ('\n') to the end of the string.
 * All other elements are returned as is.
 *
 * @param {any[]} messages - The input array.
 * @returns {any[]} - The output array with newline characters appended to string elements.
 */
function addNewline(messages: any[]): any[] {
  return messages.map((messageElement, index) => {
    if (typeof messageElement === "string" && index !== messages.length - 1) {
      return messageElement + "\n";
    }
    return messageElement;
  });
}

type CssColorKeyword =
  | "aliceblue"
  | "antiquewhite"
  | "aqua"
  | "aquamarine"
  | "azure"
  | "beige"
  | "bisque"
  | "black"
  | "blanchedalmond"
  | "blue"
  | "blueviolet"
  | "brown"
  | "burlywood"
  | "cadetblue"
  | "chartreuse"
  | "chocolate"
  | "coral"
  | "cornflowerblue"
  | "cornsilk"
  | "crimson"
  | "cyan"
  | "darkblue"
  | "darkcyan"
  | "darkgoldenrod"
  | "darkgray"
  | "darkgreen"
  | "darkkhaki"
  | "darkmagenta"
  | "darkolivegreen"
  | "darkorange"
  | "darkorchid"
  | "darkred"
  | "darksalmon"
  | "darkseagreen"
  | "darkslateblue"
  | "darkslategray"
  | "darkturquoise"
  | "darkviolet"
  | "deeppink"
  | "deepskyblue"
  | "dimgray"
  | "dodgerblue"
  | "firebrick"
  | "floralwhite"
  | "forestgreen"
  | "fuchsia"
  | "gainsboro"
  | "ghostwhite"
  | "gold"
  | "goldenrod"
  | "gray"
  | "green"
  | "greenyellow"
  | "honeydew"
  | "hotpink"
  | "indianred"
  | "indigo"
  | "ivory"
  | "khaki"
  | "lavender"
  | "lavenderblush"
  | "lawngreen"
  | "lemonchiffon"
  | "lightblue"
  | "lightcoral"
  | "lightcyan"
  | "lightgoldenrodyellow"
  | "lightgray"
  | "lightgreen"
  | "lightpink"
  | "lightsalmon"
  | "lightseagreen"
  | "lightskyblue"
  | "lightslategray"
  | "lightsteelblue"
  | "lightyellow"
  | "lime"
  | "limegreen"
  | "linen"
  | "magenta"
  | "maroon"
  | "mediumaquamarine"
  | "mediumblue"
  | "mediumorchid"
  | "mediumpurple"
  | "mediumseagreen"
  | "mediumslateblue"
  | "mediumspringgreen"
  | "mediumturquoise"
  | "mediumvioletred"
  | "midnightblue"
  | "mintcream"
  | "mistyrose"
  | "moccasin"
  | "navajowhite"
  | "navy"
  | "oldlace"
  | "olive"
  | "olivedrab"
  | "orange"
  | "orangered"
  | "orchid"
  | "palegoldenrod"
  | "palegreen"
  | "paleturquoise"
  | "palevioletred"
  | "papayawhip"
  | "peachpuff"
  | "peru"
  | "pink"
  | "plum"
  | "powderblue"
  | "purple"
  | "rebeccapurple"
  | "red"
  | "rosybrown"
  | "royalblue"
  | "saddlebrown"
  | "salmon"
  | "sandybrown"
  | "seagreen"
  | "seashell"
  | "sienna"
  | "silver"
  | "skyblue"
  | "slateblue"
  | "slategray"
  | "snow"
  | "springgreen"
  | "steelblue"
  | "tan"
  | "teal"
  | "thistle"
  | "tomato"
  | "turquoise"
  | "violet"
  | "wheat"
  | "white"
  | "whitesmoke"
  | "yellow"
  | "yellowgreen";
