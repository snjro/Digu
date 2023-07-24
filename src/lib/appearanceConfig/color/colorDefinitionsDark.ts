import type { ColorDefinitionCategories } from "./colorDefinitions";

export const colorDefinitionsDark: ColorDefinitionCategories = {
  success: {
    text: "text-green-400",
    textOpacity: "text-green-400/50",
    textHover: "hover:text-green-300",
    textEmphasis: "text-green-300",
    fill: "fill-green-400",
    fillOpacity: "fill-green-400/50",
    fillEmphasis: "fill-green-300",
    fillHover: "hover:fill-green-300",
    bg: "bg-green-500",
    bgOpacity: "bg-green-500/50",
    bgEmphasis: "bg-green-700",
    bgHover: "hover:bg-green-700",
    shadow: "shadow-green-50",
    border: "border-green-600",
  },
  error: {
    text: "text-red-400",
    textOpacity: "text-red-400/50",
    textHover: "hover:text-red-300",
    textEmphasis: "text-red-300",
    fill: "fill-red-400",
    fillOpacity: "fill-red-400/50",
    fillEmphasis: "fill-red-300",
    fillHover: "hover:fill-red-300",
    bg: "bg-red-500", //BaseToggle.syncTarget
    bgOpacity: "bg-red-500/50", //BaseToggle.syncTarget
    bgEmphasis: "bg-red-700",
    bgHover: "hover:bg-red-700",
    shadow: "shadow-red-50",
    border: "border-red-600",
  },
  interactive: {
    text: "text-blue-500",
    textOpacity: "text-blue-500/50",
    textHover: "hover:text-blue-50",
    textEmphasis: "text-blue-500",
    fill: "fill-blue-500",
    fillOpacity: "fill-blue-500/50",
    fillEmphasis: "fill-blue-500",
    fillHover: "hover:fill-blue-500",
    bg: "bg-blue-500",
    bgOpacity: "bg-blue-500/50",
    bgEmphasis: "bg-blue-500",
    bgHover: "hover:bg-blue-500",
    shadow: "shadow-blue-500",
    border: "border-blue-500",
  },
  primary: {
    text: "text-zinc-300",
    textOpacity: "text-zinc-300/50",
    textHover: "hover:text-zinc-100",
    textEmphasis: "text-zinc-100",
    fill: "fill-zinc-300",
    fillOpacity: "fill-zinc-300/50",
    fillEmphasis: "fill-zinc-100",
    fillHover: "hover:fill-zinc-100",
    bg: "bg-zinc-950",
    bgOpacity: "bg-zinc-950/50",
    bgEmphasis: "bg-zinc-700",
    bgHover: "hover:bg-zinc-700",
    shadow: "shadow-zinc-950",
    border: "border-zinc-700",
  },
  secondary: {
    text: "text-zinc-300",
    textOpacity: "text-zinc-300/50",
    textHover: "hover:text-zinc-100",
    textEmphasis: "text-zinc-100",
    fill: "fill-zinc-300",
    fillOpacity: "fill-zinc-300/50",
    fillEmphasis: "fill-zinc-100",
    fillHover: "hover:fill-zinc-100",
    bg: "bg-zinc-700",
    bgOpacity: "bg-zinc-700/50",
    bgEmphasis: "bg-zinc-500",
    bgHover: "hover:bg-zinc-500",
    shadow: "shadow-zinc-700",
    border: "border-zinc-500",
  },
};
