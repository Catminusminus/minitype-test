import { createWriteStream, readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { imageSize } from "image-size";

import { toMm } from "@/style/figure.js";

export const TMP_DIR = "tmp";

export const sum = (values: number[]) => {
  return values.reduce((a, b) => a + b, 0);
};

const getUnit = (str: string) => {
  const units = ["mm", "cm", "pt", "in"] as const;
  for (const unit of units) {
    if (str.endsWith(unit)) {
      return unit;
    }
  }
  return null;
};

export const getImageSize = (src: string) => {
  // SVG の場合、width, height 属性を取得する
  if (src.endsWith("svg")) {
    try {
      const xml = readFileSync(src, { encoding: "utf-8" });
      const data = new XMLParser({
        ignoreAttributes: false,
        ignoreDeclaration: true,
      }).parse(xml);

      if (data.svg?.["@_width"] && data.svg["@_height"]) {
        const trimedWidth = data.svg["@_width"].trim();
        const trimedHeight = data.svg["@_height"].trim();
        const widthUnit = getUnit(trimedWidth);
        const heightUnit = getUnit(trimedHeight);

        if (widthUnit && heightUnit) {
          const widthValue = parseFloat(trimedWidth.replace(widthUnit, ""));
          const heightValue = parseFloat(trimedHeight.replace(heightUnit, ""));
          return {
            width: toMm(widthValue, widthUnit),
            height: toMm(heightValue, heightUnit),
          };
        }
      }
      throw new Error(
        "Width and height specified in cm, mm, in, or pt are required.",
      );
    } catch (e) {
      throw new Error(`Failed to parse SVG: ${src}`);
    }
  }

  const size = imageSize(src);
  if (!size.width || !size.height) {
    throw new Error(`Failed to get image size: ${src}`);
  }
  return { width: size.width, height: size.height };
};

export const getFileName = (filepath: string) => {
  return path.parse(filepath).name;
};

export const clone = <T>(value: T): T => {
  // 関数をコピーするため、structuredClone ではなく独自実装を採用
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T;
  }
  if (typeof value === "object" && value !== null) {
    const newObj: any = {};
    for (const [key, itemValue] of Object.entries(value)) {
      newObj[key] = clone(itemValue);
    }
    return newObj as T;
  }
  return value;
};

export const isBrowser = () => {
  return typeof window !== "undefined";
};

export const getWriteStream = async (pdfPath: string) => {
  if (isBrowser()) {
    const blobStream = require("blob-stream");
    return blobStream();
  }
  return createWriteStream(pdfPath);
};

export const displayWarning = (message: string) => {
  console.log(message);
};
