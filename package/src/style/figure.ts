export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type PaperSize =
  | "A0"
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | "A5"
  | "A6"
  | "B0"
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6";

export type PageSize = PaperSize | Size;

export interface Em {
  type: "em";
  value: number;
}

export interface Ratio {
  type: "ratio";
  value: number;
}

export interface Shorthand<T> {
  top?: T;
  right?: T;
  bottom?: T;
  left?: T;
}

export type Margin = Shorthand<number>;
export type Padding = Shorthand<number>;

// 配置
export type Align = "left" | "center" | "right";
export type TextAlign = Align | "justify";

// 色空間
export type Color = CMYK | RGB;

export type CMYK = {
  type: "cmyk";
  c: number;
  m: number;
  y: number;
  k: number;
};

export type RGB = {
  type: "rgb";
  r: number;
  g: number;
  b: number;
};

export const getSize = (size: PageSize): Size => {
  if (typeof size === "object") {
    return size;
  }
  switch (size) {
    case "A0":
      return { width: 841, height: 1189 };
    case "A1":
      return { width: 594, height: 841 };
    case "A2":
      return { width: 420, height: 594 };
    case "A3":
      return { width: 297, height: 420 };
    case "A4":
      return { width: 210, height: 297 };
    case "A5":
      return { width: 148, height: 210 };
    case "A6":
      return { width: 105, height: 148 };
    case "B0":
      return { width: 1030, height: 1456 };
    case "B1":
      return { width: 728, height: 1030 };
    case "B2":
      return { width: 515, height: 728 };
    case "B3":
      return { width: 364, height: 515 };
    case "B4":
      return { width: 257, height: 364 };
    case "B5":
      return { width: 182, height: 257 };
    case "B6":
      return { width: 128, height: 182 };
  }
};

export const getUnit = (value: number | Em, base: number): number => {
  if (typeof value === "number") {
    return value;
  }
  // em
  return base * value.value;
};

export const invertUnit = (value: number | Em): number | Em => {
  if (typeof value === "number") {
    return -value;
  }
  // em
  return em(-value.value);
};

export const em = (value: number): Em => {
  return { type: "em", value };
};

export const ratio = (value: number): Ratio => {
  return { type: "ratio", value };
};

// 1 in = 72 pt = 24.5 mm
export const mmToPt = (mm: number) => {
  return mm / (25.4 / 72);
};

export const toMm = (value: number, unit: "mm" | "cm" | "pt" | "in") => {
  switch (unit) {
    case "mm":
      return value;
    case "cm":
      return value * 10;
    case "pt":
      return value * (25.4 / 72);
    case "in":
      return value * 25.4;
  }
};

export const getWidth = (width: number, padding?: Padding, margin?: Margin) => {
  return (
    width -
    ((padding?.left ?? 0) +
      (padding?.right ?? 0) +
      (margin?.left ?? 0) +
      (margin?.right ?? 0))
  );
};

export const getHeight = (height: number, padding?: Padding) => {
  return height - ((padding?.top ?? 0) + (padding?.bottom ?? 0));
};

// 一括指定
export const shorthand = <T>(
  values: [T] | [T, T] | [T, T, T] | [T, T, T, T],
): Shorthand<T> => {
  switch (values.length) {
    case 1:
      return {
        top: values[0],
        right: values[0],
        bottom: values[0],
        left: values[0],
      };
    case 2:
      return {
        top: values[0],
        right: values[1],
        bottom: values[0],
        left: values[1],
      };
    case 3:
      return {
        top: values[0],
        right: values[1],
        bottom: values[2],
        left: values[1],
      };
    case 4:
      return {
        top: values[0],
        right: values[1],
        bottom: values[2],
        left: values[3],
      };
  }
};

// 配置方向
export const isAlign = (value: string): value is Align => {
  return value === "left" || value === "center" || value === "right";
};

export const isTextAlign = (value: string): value is TextAlign => {
  return (
    value === "left" ||
    value === "center" ||
    value === "right" ||
    value === "justify"
  );
};

export const getAlignRatio = (align: Align) => {
  return align === "center" ? 0.5 : align === "right" ? 1 : 0;
};

// 色空間
export const cmyk = (c: number, m: number, y: number, k: number): CMYK => ({
  type: "cmyk",
  c,
  m,
  y,
  k,
});

export const rgb = (r: number, g: number, b: number): RGB => ({
  type: "rgb",
  r,
  g,
  b,
});

export const hexToRgb = (hex: string): RGB => {
  let number = hex.replace("#", "");
  if (number.length === 3) {
    number = number[0].repeat(2) + number[1].repeat(2) + number[2].repeat(2);
  }
  const r = parseInt(number.slice(0, 2), 16);
  const g = parseInt(number.slice(2, 4), 16);
  const b = parseInt(number.slice(4, 6), 16);
  return rgb(r, g, b);
};
