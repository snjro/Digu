const baseSizes = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const;

export type BaseSize = (typeof baseSizes)[number];

export const baseTextSizes: { [key in BaseSize]: `text-${string}` } = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};
export const baseTextHeight: { [key in BaseSize]: `h-${string}` } = {
  xs: "h-4",
  sm: "h-5",
  md: "h-6",
  lg: "h-7",
  xl: "h-7",
  "2xl": "h-8",
  "3xl": "h-9",
  "4xl": "h-10",
  "5xl": "h-12",
};
export const leftSideBarItemHeight: { [key in BaseSize]: `h-${string}` } = {
  xs: "h-5",
  sm: "h-6",
  md: "h-7",
  lg: "h-8",
  xl: "h-8",
  "2xl": "h-9",
  "3xl": "h-10",
  "4xl": "h-11",
  "5xl": "h-14",
};
export const buttonHeight: { [key in BaseSize]: `h-${string}` } = {
  xs: "h-6",
  sm: "h-7",
  md: "h-8",
  lg: "h-9",
  xl: "h-9",
  "2xl": "h-10",
  "3xl": "h-11",
  "4xl": "h-12",
  "5xl": "h-14",
};
export const spinnerSize: { [key in BaseSize]: `h-${number} w-${number}` } = {
  xs: "h-6 w-6",
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
  xl: "h-9 w-9",
  "2xl": "h-10 w-10",
  "3xl": "h-11 w-11",
  "4xl": "h-12 w-12",
  "5xl": "h-14 w-14",
};

export const baseShadowSizes: { [key in BaseSize]: string } = {
  xs: "shadow-sm",
  sm: "shadow-sm",
  md: "shadow-sm",
  lg: "shadow",
  xl: "shadow",
  "2xl": "shadow",
  "3xl": "shadow",
  "4xl": "shadow-md",
  "5xl": "shadow-md",
};

export const baseTextSizesPixel: { [key in BaseSize]: `${number}px` } = {
  xs: "12px",
  sm: "14px",
  md: "16px",
  lg: "18px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "30px",
  "4xl": "36px",
  "5xl": "48px",
};

export function changeSize(baseSize: BaseSize, notch: number): BaseSize {
  const indexOfBaseSize: number = baseSizes.indexOf(baseSize);
  let indexOfChangedSize: number;
  if (indexOfBaseSize + notch > baseSizes.length - 1) {
    indexOfChangedSize = baseSizes.length - 1;
  } else if (indexOfBaseSize + notch < 0) {
    indexOfChangedSize = 0;
  } else {
    indexOfChangedSize = indexOfBaseSize + notch;
  }
  return baseSizes[indexOfChangedSize];
}
