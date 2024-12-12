import { v4 as uuidV4 } from "uuid";

import { BaseBlock, Block } from "./block.js";
import { Inline, isCommand } from "./inline.js";

export type LabelMap = {
  block: {
    label: Record<string, BlockLabel>;
    id: Record<string, BlockLabel>;
  };
};

export type BlockLabel =
  | {
      type: BlockLabelType;
      index: number;
      pageIndex: number | null;
      id: string;
    }
  | {
      type: "heading";
      index: HeadingIndex;
      pageIndex: number | null;
      id: string;
    };

// Block の type と合わせる
export type BlockLabelType =
  | "paragraph"
  | "code"
  | "list"
  | "figure"
  | "caption"
  | "math"
  | "footnote"
  | "table"
  | "pillar"
  | "nombre"
  | "newpage"
  | "vertical"
  | "box"
  | "custom";

export type HeadingIndex = [number, number, number, number];

const count: { [key in BlockLabelType]: number } & { heading: HeadingIndex } = {
  heading: [0, 0, 0, 0],
  paragraph: 0,
  code: 0,
  list: 0,
  figure: 0,
  caption: 0,
  math: 0,
  table: 0,
  footnote: 0,
  pillar: 0,
  nombre: 0,
  newpage: 0,
  vertical: 0,
  box: 0,
  custom: 0,
};

/**
 * ブロックの相互参照を解決する
 */
export const resolveBlockLabels = (blocks: Block[], labelMap: LabelMap) => {
  for (const block of blocks) {
    block.id = uuidV4();

    // 見出し
    if (block.type === "heading") {
      count.heading[block.level - 1]++;
      const label: BlockLabel = {
        type: "heading",
        index: [...count.heading],
        pageIndex: null,
        id: block.id!,
      };
      labelMap.block.id[block.id!] = label;
      if (block.label) {
        labelMap.block.label[block.label] = label;
      }
    }
    // その他
    else {
      count[block.type]++;
      const newLabel: BlockLabel = {
        type: block.type,
        index: count[block.type],
        pageIndex: null,
        id: block.id!,
      };
      labelMap.block.id[block.id!] = newLabel;
      if (block.label) {
        labelMap.block.label[block.label] = newLabel;
      }
    }

    // ボックスの子ブロックに対して再帰的に実行
    if (block.type === "box") {
      resolveBlockLabels(block.blocks, labelMap);
    }
  }
};

/**
 * コマンドの相互参照を解決する
 */
export const assignCommandIds = (blocks: BaseBlock[]) => {
  const loopLabels = (inlines: Inline[]) => {
    if (!inlines) {
      return
    }
    for (const inline of inlines) {
      if (isCommand(inline)) {
        inline.id = uuidV4();

        // コマンドの内容に対して再帰的に実行
        loopLabels(inline.body);
      }
    }
  };

  for (const block of blocks) {
    if ("lines" in block && block.lines) {
      for (const line of block.lines) {
        if (Array.isArray(line)) {
          loopLabels(line);
        }
      }
    }

    // 表
    if (block.type === "table") {
      for (const row of block.rows) {
        for (const cell of row) {
          for (const line of cell) {
            loopLabels(line);
          }
        }
      }
    }

    // ボックスの子ブロックに対して再帰的に実行
    if (block.type === "box") {
      assignCommandIds(block.blocks);
    }
  }
};
