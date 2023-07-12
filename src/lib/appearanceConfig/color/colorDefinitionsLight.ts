import type { ColorDefinitionCategories } from "./colorDefinitions";

export const colorDefinitionsLight: ColorDefinitionCategories = {
  success: {
    text: "text-green-600",
    textOpacity: "text-green-600/50",
    textHover: "hover:text-green-700",
    textEmphasis: "text-green-700",
    fill: "fill-green-600",
    fillOpacity: "fill-green-600/50",
    fillEmphasis: "fill-green-700",
    fillHover: "hover:fill-green-700",
    bg: "bg-green-600",
    bgOpacity: "bg-green-600/50",
    bgEmphasis: "bg-green-700",
    bgHover: "hover:bg-green-700",
    shadow: "shadow-green-900",
    border: "border-green-900",
  },
  error: {
    text: "text-red-600",
    textOpacity: "text-red-600/50",
    textHover: "hover:text-red-700",
    textEmphasis: "text-red-700",
    fill: "fill-red-600",
    fillOpacity: "fill-red-600/50",
    fillEmphasis: "fill-red-700",
    fillHover: "hover:fill-red-700",
    bg: "bg-red-600",
    bgOpacity: "bg-red-600/50",
    bgEmphasis: "bg-red-700",
    bgHover: "hover:bg-red-700",
    shadow: "shadow-red-900",
    border: "border-red-900",
  },
  interactive: {
    text: "text-blue-600",
    textOpacity: "text-blue-600/50",
    textHover: "hover:text-blue-700",
    textEmphasis: "text-blue-700",
    fill: "fill-blue-600",
    fillOpacity: "fill-blue-600/50",
    fillEmphasis: "fill-blue-700",
    fillHover: "hover:fill-blue-700",
    bg: "bg-blue-600",
    bgOpacity: "bg-blue-600/50",
    bgEmphasis: "bg-blue-700",
    bgHover: "hover:bg-blue-700",
    shadow: "shadow-blue-600",
    border: "border-blue-600",
  },
  primary: {
    text: "text-zinc-600", //leftsidebar(header/footer) text
    textOpacity: "text-zinc-600/50", //leftsidebar(header/footer) text
    textHover: "hover:text-zinc-700",
    textEmphasis: "text-zinc-700",
    fill: "fill-zinc-600", //leftsidebar(header/footer) icon
    fillOpacity: "fill-zinc-600/50", //leftsidebar(header/footer) icon
    fillEmphasis: "fill-zinc-700", //leftsidebar(header/footer) icon
    fillHover: "hover:fill-zinc-700", //leftsidebar(header/footer) icon
    bg: "bg-zinc-100",
    bgOpacity: "bg-zinc-100/50",
    bgEmphasis: "bg-zinc-200",
    bgHover: "hover:bg-zinc-200",
    shadow: "shadow-zinc-600", //leftsidebar/Nav(Body/Buttons) shadow
    border: "border-zinc-300", //breadcrumb border
  },
  secondary: {
    text: "text-zinc-600", //leftsidebar(header/footer) text
    textOpacity: "text-zinc-600/50", //leftsidebar(header/footer) text
    textHover: "hover:text-zinc-900",
    textEmphasis: "text-zinc-900",
    fill: "fill-zinc-600", //leftsidebar(header/footer) icon
    fillOpacity: "fill-zinc-600/50", //leftsidebar(header/footer) icon
    fillEmphasis: "fill-zinc-900", //leftsidebar(header/footer) icon
    fillHover: "hover:fill-zinc-900", //leftsidebar(header/footer) icon
    bg: "bg-zinc-300",
    bgOpacity: "bg-zinc-300/50",
    bgEmphasis: "bg-zinc-200",
    bgHover: "hover:bg-zinc-200",
    shadow: "shadow-zinc-800", //leftsidebar/Nav(Body/Buttons) shadow
    border: "border-zinc-400", //breadcrumb border
  },
};
