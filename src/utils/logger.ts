import { convertTimestampSecToIso8601 } from "./utilsTime";
export class myLogger {
  // eslint-disable-next-line
  static info(...messages: any[]) {
    logBase("  info  ", messages);
  }
  // eslint-disable-next-line
  static start(...messages: any[]) {
    logBase(" start  ", messages);
  }
  // eslint-disable-next-line
  static finished(...messages: any[]) {
    logBase("finished", messages);
  }
  // eslint-disable-next-line
  static success(...messages: any[]) {
    logBase("success ", messages);
  }
  // eslint-disable-next-line
  static fail(...messages: any[]) {
    logBase("  fail  ", messages);
  }
  // eslint-disable-next-line
  static error(...messages: any[]) {
    logBase(" error  ", messages);
  }
  // eslint-disable-next-line
  static fatal(...messages: any[]) {
    logBase(" fatal  ", messages);
  }
  // eslint-disable-next-line
  static warn(...messages: any[]) {
    logBase("  warn  ", messages);
  }
  // eslint-disable-next-line
  static debug(...messages: any[]) {
    logBase(" debug  ", messages);
  }
}

type LogType =
  | "  info  "
  | " start  "
  | "finished"
  | "success "
  | "  fail  "
  | " error  "
  | " fatal  "
  | "  warn  "
  | " debug  ";

const labelBgColor = (logType: LogType): CssColorKeyword => {
  switch (logType) {
    case "  info  ":
      return "white";
    case " start  ":
      return "skyblue";
    case "finished":
      return "deepskyblue";
    case "success ":
      return "limegreen";
    case "  fail  ":
      return "tomato";
    case " error  ":
      return "orangered";
    case " fatal  ":
      return "red";
    case "  warn  ":
      return "gold";
    case " debug  ":
      return "mediumpurple";
  }
};

const logBase = (logType: LogType, messages: any[]) => {
  const headerLabel: string = `%c${logType}%c ${convertTimestampSecToIso8601()}`;

  const cssForLabel = (logType: LogType): string =>
    convertStringArrayToCssText([
      `background-color:${labelBgColor(logType)}`,
      "color:black",
      "padding: 1px 4px",
      "font-family: monospace",
      "font-weight: 700",
      "border-radius: 4px",
      ``,
    ]);
  const cssForTime: string = convertStringArrayToCssText([
    "font-family: monospace",
    "color: gray",
  ]);

  switch (logType) {
    case "  info  ":
    case " start  ":
    case "finished":
    case "success ":
    case "  fail  ":
      console.log(headerLabel, cssForLabel(logType), cssForTime, ...messages);
      break;
    case " error  ":
    case " fatal  ":
      console.error(headerLabel, cssForLabel(logType), cssForTime, ...messages);
      break;
    case "  warn  ":
      console.warn(headerLabel, cssForLabel(logType), cssForTime, ...messages);
      break;
    case " debug  ":
      console.debug(headerLabel, cssForLabel(logType), cssForTime, ...messages);
      break;
  }
};

function convertStringArrayToCssText(arrCss: string[]): string {
  return arrCss.join("; ") + ";";
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
