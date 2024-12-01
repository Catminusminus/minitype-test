import { readFileSync } from "fs";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import SVGtoPDF from "svg-to-pdfkit";

import { Color, Padding, mmToPt } from "@/style/figure.js";
import { Decoration } from "@/style/style.js";
import { getPath } from "./font.js";
import { CharInfo, Link } from "./inline.js";

export type Drawable =
  | DrawableLine
  | DrawableFigure
  | DrawableRect
  | DrawableLink
  | DrawableDestination;

export interface Drawablebase {
  y: number;
  zIndex: [number, number];
}

export type DrawableLine = {
  type: "line";
  chars: CharInfo[];
  x: number;
} & Drawablebase;

export type DrawableFigure = {
  type: "figure";
  src: string;
  x: number;
  width: number;
  height: number;
} & Drawablebase;

export type DrawableRect = {
  type: "rect";
  x: number;
  width: number;
  height: number;
  decoration: Decoration;
} & Drawablebase;

export type DrawableLink = {
  type: "link";
  x: number;
  width: number;
  height: number;
  link: Link;
} & Drawablebase;

export type DrawableDestination = {
  type: "destination";
  id: string;
} & Drawablebase;

const toPDFColor = (
  color: Color
): [number, number, number] | [number, number, number, number] => {
  return color.type === "rgb"
    ? [color.r, color.g, color.b]
    : [color.c, color.m, color.y, color.k];
};

/**
 * 描画する
 */
export const draw = (
  drawablesByPage: Drawable[][],
  padding: Padding,
  outline: boolean,
  pdfDoc: PDFKit.PDFDocument
) => {
  for (let i = 0; i < drawablesByPage.length; i++) {
    // ページ毎に zIndex でソート
    const sortedDrawables = [...drawablesByPage[i]].sort((a, b) =>
      a.zIndex[0] === b.zIndex[0]
        ? a.zIndex[1] - b.zIndex[1]
        : a.zIndex[0] - b.zIndex[0]
    );

    for (const drawable of sortedDrawables) {
      switch (drawable.type) {
        case "line":
          drawLine(drawable, padding, outline, pdfDoc);
          break;
        case "figure":
          drawFigure(drawable, padding, pdfDoc);
          break;
        case "rect":
          drawRect(drawable, padding, pdfDoc);
          break;
        case "link":
          drawLink(drawable, padding, pdfDoc);
          break;
        case "destination":
          drawDestination(drawable, pdfDoc);
          break;
      }
    }
    // 改ページ
    if (i < drawablesByPage.length - 1) {
      clearPage(pdfDoc);
    }
  }
};

/**
 * テキスト 1 行を描画する
 */
const drawLine = (
  line: DrawableLine,
  padding: Padding,
  outline: boolean,
  pdfDoc: PDFKit.PDFDocument
) => {
  // TODO: アウトライン処理かを分岐する
  for (const char of line.chars) {
    const path = getPath(
      char.char,
      mmToPt(line.x + char.x + (padding.left ?? 0)),
      mmToPt(line.y + char.y + (padding.top ?? 0)),
      mmToPt(char.size),
      char.font
    );
    pdfDoc.path(path).fill(toPDFColor(char.color));
  }
};

const clearPage = (pdfDoc: PDFKit.PDFDocument) => {
  pdfDoc.addPage();
};

/**
 * 図版を描画する
 */
const drawFigure = (
  figure: DrawableFigure,
  padding: Padding,
  pdfDoc: PDFKit.PDFDocument
) => {
  const x = mmToPt(figure.x + (padding.left ?? 0));
  const y = mmToPt(figure.y + (padding.top ?? 0));
  // SVG
  if (figure.src.endsWith(".svg")) {
    const options = {
      ignoreAttributes: false,
      ignoreDeclaration: true,
    };
    const svg = readFileSync(figure.src, "utf-8");
    const data = new XMLParser(options).parse(svg);
    data.svg["@_width"] = `${figure.width}mm`;
    data.svg["@_height"] = `${figure.height}mm`;

    const newSvg = new XMLBuilder(options).build(data);
    SVGtoPDF(pdfDoc, newSvg, x, y);
    return;
  }
  // 画像
  pdfDoc.image(figure.src, x, y, {
    width: mmToPt(figure.width),
    height: mmToPt(figure.height),
  });
};

/**
 * 矩形を描画する
 */
const drawRect = (
  rect: DrawableRect,
  padding: Padding,
  pdfDoc: PDFKit.PDFDocument
) => {
  const x = mmToPt(rect.x + (padding.left ?? 0));
  const y = mmToPt(rect.y + (padding.top ?? 0));

  // 背景
  if (rect.decoration.background) {
    pdfDoc
      .roundedRect(
        x,
        y,
        mmToPt(rect.width),
        mmToPt(rect.height),
        mmToPt(rect.decoration.borderRadius ?? 0)
      )
      .fill(toPDFColor(rect.decoration.background));
  }

  // 枠線
  // TODO: 枠線の太さだけ右下にずれるのを修正
  // TODO: 角丸と枠線の接合
  const border = rect.decoration.border;
  if (border) {
    if (border.top) {
      pdfDoc
        .moveTo(x, y)
        .lineTo(x + mmToPt(rect.width), y)
        .lineWidth(mmToPt(border.top.width))
        .stroke(toPDFColor(border.top.color));
    }
    if (border.right) {
      const borderX = x + mmToPt(rect.width);
      pdfDoc
        .moveTo(borderX, y)
        .lineTo(borderX, y + mmToPt(rect.height))
        .lineWidth(mmToPt(border.right.width))
        .stroke(toPDFColor(border.right.color));
    }
    if (border.bottom) {
      const borderY = y + mmToPt(rect.height);
      pdfDoc
        .moveTo(x, borderY)
        .lineTo(x + mmToPt(rect.width), borderY)
        .lineWidth(mmToPt(border.bottom.width))
        .stroke(toPDFColor(border.bottom.color));
    }
    if (border.left) {
      pdfDoc
        .moveTo(x, y)
        .lineTo(x, y + mmToPt(rect.height))
        .lineWidth(mmToPt(border.left.width))
        .stroke(toPDFColor(border.left.color));
    }
  }
};

/*
 * 注釈としてリンクを描画する
 */
const drawLink = (
  link: DrawableLink,
  padding: Padding,
  pdfDoc: PDFKit.PDFDocument
) => {
  const x = mmToPt(link.x + (padding.left ?? 0));
  const y = mmToPt(link.y + (padding.top ?? 0));
  const width = mmToPt(link.width);
  const height = mmToPt(link.height);

  const annotation = pdfDoc.rectAnnotation(x, y, width, height, {
    color: "#FF0000",
  });

  switch (link.link.type) {
    case "url":
      annotation.link(x, y, width, height, link.link.url);
      break;
    case "destination":
      annotation.goTo(x, y, width, height, link.link.destination);
      break;
  }
};

/**
 * デスティネーション（移動先）を追加する
 */
const drawDestination = (
  destination: DrawableDestination,
  pdfDoc: PDFKit.PDFDocument
) => {
  // addNamedDestination は型定義にない
  (pdfDoc as any).addNamedDestination(
    destination.id,
    "XYZ",
    0,
    destination.y,
    null
  );
};
