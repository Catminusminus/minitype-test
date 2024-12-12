import fs from "fs";
import PDFDocument from "pdfkit";
import sqlite from "sqlite3";

import { BaseBlock, Block, blockToBaseBlock } from "./lib/block.js";
import { Drawable, draw } from "./lib/draw.js";
import {
  loadFontCommandsCaches,
  loadFonts,
  saveFontCaches,
} from "./lib/font.js";
import { HorizontalProcessor } from "./lib/horizontal.js";
import { LabelMap, assignCommandIds, resolveBlockLabels } from "./lib/label.js";
import { TMP_DIR, clone, getWriteStream } from "./lib/utils.js";
import { VerticalProcessor } from "./lib/vertical.js";
import { CommandTransformer, applyTransformer } from "./plugin/index.js";
import { BlockTransformer, CustomExtender } from "./plugin/index.js";
import { getHeight, getSize, getWidth, mmToPt } from "./style/figure.js";
import { DocumentStyle, collectFontSrcs } from "./style/style.js";

export interface MiniTypeOptions {
  outline?: boolean;
  blockTransformers?: BlockTransformer[];
  commandTransformers?: CommandTransformer[];
  customExtenders?: CustomExtender[];
}

export const minitype = async (
  body: Block[],
  style: DocumentStyle,
  pdfPath: string,
  options?: MiniTypeOptions,
) => {
  console.log("body: ", JSON.stringify(body, null, 2))
  console.log("minitype\n");
  const db = new sqlite.Database("./font-caches.db");

  displayStep(1, "Compositing document...");
  const size = getSize(style.size);
  const baseWidth = getWidth(size.width, style.padding);
  const baseHeight = getHeight(size.height, style.padding);

  // 一時保存用のディレクトリを作成
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR);
  }

  // CustomExtender の実行
  for (let i = 0; i < body.length; i++) {
    for (const extender of options?.customExtenders ?? []) {
      const extendeds = await extender(body[i]);
      if (extendeds.length > 0) {
        body.splice(i, 1, ...extendeds);
      }
    }
  }

  // 相互参照の解決
  const labelMap: LabelMap = {
    block: {
      label: {},
      id: {},
    },
  };
  console.log(body);
  // 柱とノンブルは後ほど処理する
  const filteredBody = body.filter(
    (block) => block.type !== "pillar" && block.type !== "nombre",
  );
  resolveBlockLabels(filteredBody, labelMap);

  let drawablesByPage: Drawable[][] = [];

  for (let i = 0; i < 2; i++) {
    const clonedBody = clone(filteredBody);

    // プラグインの実行
    displayStep(2, "Running plugins...");
    applyTransformer(
      clonedBody,
      options?.blockTransformers ?? [],
      options?.commandTransformers ?? [],
      labelMap,
    );

    // フォントの読み込み
    if (i === 0) {
      displayStep(3, "Loading fonts...");
      await loadFonts(collectFontSrcs(clonedBody, style), db);
    } else {
      displayStep(3, "Loading fonts is skipped");
    }

    // BaseBlock への変換
    const baseBlocks: BaseBlock[] = [];
    for (const block of clonedBody) {
      const baseBlock = await blockToBaseBlock(block, style.block);
      if (baseBlock) {
        baseBlocks.push(baseBlock);
      }
    }

    // コマンドに ID を付与
    assignCommandIds(baseBlocks);

    // 水平位置を計算
    displayStep(4, "Typesetting...");

    const horizontalProcessor = new HorizontalProcessor(
      style,
      baseWidth,
      labelMap,
    );
    const { blockInfoList, labelToFootnote } =
      horizontalProcessor.process(baseBlocks);

    // ページ位置・垂直位置を計算
    const baseSize = { width: baseWidth, height: baseHeight };
    const verticalProcessor = new VerticalProcessor(
      blockInfoList,
      labelToFootnote,
      style,
      baseSize,
      labelMap,
    );
    drawablesByPage = verticalProcessor.process();
  }

  // 柱・ノンブルの処理
  displayStep(5, "Processing pillars and nombre...");
  const pillar = body.find((block) => block.type === "pillar");
  const nombre = body.find((block) => block.type === "nombre");
  const pageCount = drawablesByPage.length;
  const flowTextsByPage = [...Array(pageCount)].map(() =>
    [pillar, nombre].flatMap((x) => x ?? []),
  );

  resolveBlockLabels(flowTextsByPage.flat(), labelMap);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    // ページ番号の付与
    for (const block of flowTextsByPage[pageIndex]) {
      labelMap.block.id[block.id!].pageIndex = pageIndex + 1;
    }

    // プラグインの実行
    applyTransformer(
      flowTextsByPage[pageIndex],
      options?.blockTransformers ?? [],
      options?.commandTransformers ?? [],
      labelMap,
    );

    // BaseBlock への変換
    const baseBlocks: BaseBlock[] = [];
    for (const block of flowTextsByPage[pageIndex]) {
      const baseBlock = await blockToBaseBlock(block, style.block);
      if (baseBlock) {
        baseBlocks.push(baseBlock);
      }
    }

    // 水平位置を計算
    const horizontalProcessor = new HorizontalProcessor(
      style,
      baseWidth,
      labelMap,
    );
    const { blockInfoList, labelToFootnote } =
      horizontalProcessor.process(baseBlocks);

    // ページ位置・垂直位置を計算
    const baseSize = { width: baseWidth, height: baseHeight };
    const verticalProcessor = new VerticalProcessor(
      blockInfoList,
      labelToFootnote,
      style,
      baseSize,
      labelMap,
    );
    const drawables = verticalProcessor.process()[0].flat();
    drawablesByPage[pageIndex].push(...drawables);
  }

  // グリフを読み込む
  type FileName = string;
  const charMap: Record<FileName, Set<string>> = {};
  for (const drawable of drawablesByPage.flat()) {
    if (drawable.type === "line") {
      for (const { char, font } of drawable.chars) {
        if (!charMap[font]) {
          charMap[font] = new Set();
        }
        charMap[font].add(char);
      }
    }
  }
  await loadFontCommandsCaches(charMap, db);

  // 描画
  displayStep(6, "Outputting a PDF file...");
  const outline = options?.outline ?? false;

  const savePdf = () =>
    new Promise<void>((resolve) => {
      (async () => {
        const pdfDoc = new PDFDocument({
          size: [mmToPt(size.width), mmToPt(size.height)],
          compress: true,
        });

        const writeStream = await getWriteStream(pdfPath);
        writeStream.on("finish", () => {
          resolve();
        });

        draw(drawablesByPage, style.padding, outline, pdfDoc);
        pdfDoc.pipe(writeStream);
        pdfDoc.end();
        console.log(`Saved at: ${pdfPath}`);
      })();
    });

  // フォントのキャッシュデータを保存
  console.log("\nSaving font caches to DB...");

  await Promise.all([savePdf(), saveFontCaches(db)]);

  // 一時保存用のディレクトリを削除
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true });
  }
};

/**
 * 進行状況を表示する
 */
const displayStep = (index: number, message: string) => {
  const steps = 6;
  console.log(`[${index}/${steps}] ${message}`);
};
