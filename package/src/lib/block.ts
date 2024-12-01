import { writeFileSync } from "fs";
import { v4 as uuidV4 } from "uuid";

import {
  getHighlightThemeRecord,
  highlightThemes,
} from "@/highlight/highlight.js";
import { DEFAULT_LIST_ITEM } from "@/style/default-style.js";
import { hexToRgb } from "@/style/figure.js";
import {
  BlockStyleList,
  Border,
  FigureStyle,
  InlineStyle,
  ListStyle,
  MathStyle,
  TableStyle,
  TextStyle,
} from "@/style/style.js";
import { CharInfo, CharRectInfo, Inline, InlineWithId } from "./inline.js";
import { texToSvg } from "./math.js";
import { TMP_DIR, displayWarning } from "./utils.js";

// Block
export type Block =
  | Paragraph
  | Heading
  | Code
  | List
  | Figure
  | Caption
  | MathBlock
  | Table
  | Footnote
  | PillarNombre
  | NewPage
  | Vertical
  | Box
  | CustomBlock;

interface AbstractBlock {
  label?: string;
  id?: string;
}

// 段落
export type Paragraph = {
  type: "paragraph";
  lines: Inline[][];
  style?: Partial<TextStyle>;
} & AbstractBlock;

// 見出し
export type Heading = {
  type: "heading";
  level: HeadingLevel;
  lines: Inline[][];
  style?: Partial<TextStyle>;
} & AbstractBlock;

// レベル1: タイトル, レベル2: 見出し, レベル3: 小見出し, レベル4: 小小見出し
export type HeadingLevel = 1 | 2 | 3 | 4;

// コードブロック
export type Code = {
  type: "code";
  lines: string[];
  lang?: string;
  theme?: string;
} & AbstractBlock;

// 箇条書き
export type List = {
  type: "list";
  level: 1 | 2 | 3;
  lines: Inline[][];
  style?: ListStyle;
} & AbstractBlock;

// 図版
export type Figure = {
  type: "figure";
  src: string;
  style?: FigureStyle;
} & AbstractBlock;

// キャプション
export type Caption = {
  type: "caption";
  lines: Inline[][];
  style?: Partial<TextStyle>;
} & AbstractBlock;

// 数式
export type MathBlock = {
  type: "math";
  lines: string[];
  style?: MathStyle;
} & AbstractBlock;

// 表
export type Table = {
  type: "table";
  rows: Inline[][][][];
  horizontalBorders: (Border | null)[];
  verticalBorders: (Border | null)[];
  widths?: (number | null)[];
  style?: TableStyle;
} & AbstractBlock;

// 脚注
export type Footnote = {
  type: "footnote";
  lines: Inline[][];
  style?: Partial<TextStyle>;
  label: string;
  id?: string;
};

// 柱・ノンブル
export type PillarNombre = {
  type: "pillar" | "nombre";
  lines: Inline[][];
  style?: Partial<TextStyle>;
} & AbstractBlock;

// 改ページ
export type NewPage = {
  type: "newpage";
} & AbstractBlock;

// 縦方向のスペース
export type Vertical = {
  type: "vertical";
  space: number;
} & AbstractBlock;

// ボックス
export type Box = {
  type: "box";
  name: string;
  blocks: Block[];
} & AbstractBlock;

// カスタムブロック
export type CustomBlock = {
  type: "custom";
  name: string;
  lines: string[];
  attrs: Record<string, string>;
} & AbstractBlock;

// BaseBlock
export type BaseBlock =
  | Text
  | FlowText
  | FigureWithId
  | TableWithId
  | NewPageWithId
  | VerticalWithId
  | BoxWithId;

interface AbstractBaseBlock {
  label?: string;
  id: string;
}

export type TextSubType = TextMiddleSubType | "footnote";

type TextMiddleSubType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "code"
  | "list1"
  | "list2"
  | "list3"
  | "caption";

export type FlowTextSubType = "pillar" | "nombre";

export type Text = {
  type: "text";
  lines: Inline[][];
  splitable: boolean;
  style?: Partial<TextStyle>;
  id: string;
} & (
  | {
      subtype: TextMiddleSubType;
      label?: string;
    }
  | {
      subtype: "footnote";
      label: string;
    }
);

export type FlowText = {
  type: "flow-text";
  subtype: FlowTextSubType;
  lines: Inline[][];
  style?: Partial<TextStyle>;
  label?: string;
  id: string;
};

export type FigureWithId = Omit<Figure, "id"> & { id: string };
export type TableWithId = Omit<Table, "id"> & { id: string };
export type NewPageWithId = Omit<NewPage, "id"> & { id: string };
export type VerticalWithId = Omit<Vertical, "id"> & { id: string };
export type BoxWithId = Omit<Box, "blocks" | "id"> & {
  blocks: BaseBlock[];
  id: string;
};

// BlockInfo
export type BlockInfo =
  | TextInfo
  | FlowTextInfo
  | TableInfo
  | BoxInfo
  | FigureWithId
  | NewPageWithId
  | VerticalWithId;

export type TextInfo = {
  type: "text";
  subtype: TextSubType;
  lines: CharInfo[][];
  // 矩形
  lineRects: CharRectInfo[][];
  // 脚注の参照
  lineToFootnotes: string[][];
  splitable: boolean;
} & AbstractBaseBlock;

export type FlowTextInfo = {
  type: "flow-text";
  subtype: FlowTextSubType;
  lines: CharInfo[][];
  lineRects: CharRectInfo[][];
} & AbstractBaseBlock;

export type TableInfo = {
  type: "table";
  rows: TableCellInfo[][];
  horizontalBorders: (Border | null)[];
  verticalBorders: (Border | null)[];
  style?: TableStyle;
} & AbstractBaseBlock;

export type TableCellInfo = {
  x: number;
  width: number;
  lines: CharInfo[][];
  lineRects: CharRectInfo[][];
  lineToFootnotes: string[][];
};

export type BoxInfo = {
  type: "box";
  name: string;
  position: "start" | "end";
} & AbstractBaseBlock;

/**
 * Block を BaseBlock に変換する
 */
export const blockToBaseBlock = async (
  block: Block,
  blockStyles: BlockStyleList
): Promise<BaseBlock | null> => {
  // テキスト
  if (
    block.type === "paragraph" ||
    block.type === "heading" ||
    block.type === "caption"
  ) {
    const subtype: TextSubType =
      block.type === "heading" ? `h${block.level}` : block.type;
    return {
      type: "text",
      subtype,
      // id は付与済み
      lines: block.lines as InlineWithId[][],
      splitable: block.type !== "heading",
      style: block.style,
      label: block.label,
      // id は付与済み
      id: block.id!,
    };
  }
  if (block.type === "footnote") {
    return {
      type: "text",
      subtype: block.type,
      // id は付与済み
      lines: block.lines as InlineWithId[][],
      splitable: false,
      style: block.style,
      label: block.label,
      // id は付与済み
      id: block.id!,
    };
  }
  // 柱、ノンブル
  if (block.type === "pillar" || block.type === "nombre") {
    return {
      type: "flow-text",
      subtype: block.type,
      // id は付与済み
      lines: block.lines as InlineWithId[][],
      style: block.style,
      label: block.label,
      // id は付与済み
      id: block.id!,
    };
  }
  // シンタックスハイライト
  if (block.type === "code") {
    return await convertCode(block);
  }
  // リスト
  if (block.type === "list") {
    return convertList(block, blockStyles);
  }
  // 数式
  if (block.type === "math") {
    return await convertMathBlock(block, blockStyles);
  }
  // 表
  if (block.type === "table") {
    return convertTable(block);
  }
  // ボックス
  if (block.type === "box") {
    // 子ブロックを再帰的に処理
    const baseBlocks: BaseBlock[] = [];
    for (const childBlock of block.blocks) {
      const childBaseBlock = await blockToBaseBlock(childBlock, blockStyles);
      if (childBaseBlock) {
        baseBlocks.push(childBaseBlock);
      }
    }
    return {
      type: "box",
      name: block.name,
      blocks: baseBlocks,
      label: block.label,
      // id は付与済み
      id: block.id!,
    };
  }
  // その他
  if (
    block.type === "figure" ||
    block.type === "newpage" ||
    block.type === "vertical"
  ) {
    return block as BaseBlock;
  }
  return null;
};

/**
 * シンタックスハイライトを処理する
 */
const convertCode = async (block: Code): Promise<Text> => {
  const { common, createLowlight } = await import("lowlight");
  const lowlight = createLowlight(common);
  // TODO: 型定義
  type ElementContent = any;

  const joinedLine = block.lines.join("\n");
  const tree = block.lang
    ? lowlight.highlight(block.lang, joinedLine)
    : lowlight.highlightAuto(joinedLine);
  const inlines: Inline[][] = [[]];

  const highlight = highlightThemes.default;
  const hightlightRecord = getHighlightThemeRecord(highlight);

  const explore = (content: ElementContent, color?: string) => {
    switch (content.type) {
      case "element":
        for (const child of content.children) {
          // TODO: 複雑なクラス名への対応
          const className = content.properties.className;
          const newColor = Array.isArray(className)
            ? hightlightRecord.class[className[0]]?.color ?? color
            : color;
          explore(child, newColor);
        }
        break;

      case "text":
        const lines = content.value.split("\n");
        const style: Partial<InlineStyle> = color
          ? { color: hexToRgb(color) }
          : {};
        for (let i = 0; i < lines.length; i++) {
          // TODO: 太字、斜体、下線への対応
          inlines.at(-1)!.push({ body: [lines[i]], style });
          if (i < lines.length - 1) {
            inlines.push([]);
          }
        }
        break;

      case "comment":
        inlines.at(-1)!.push(content.value);
    }
  };

  for (const t of tree.children) {
    if (t.type !== "doctype") {
      explore(t);
    }
  }

  return {
    type: "text",
    subtype: "code",
    lines: inlines,
    splitable: true,
    label: block.label,
    // id は付与済み
    id: block.id!,
  };
};

/**
 * リストを処理する
 */
const convertList = async (block: List, blockStyles: BlockStyleList) => {
  // マーカを挿入
  const item =
    block.style?.item ?? blockStyles.list?.item ?? (() => DEFAULT_LIST_ITEM);
  const lines = [...block.lines];
  if (lines.length > 0) {
    lines[0].unshift(item(block.level));
  }

  const text: Text = {
    type: "text",
    subtype: `list${block.level}`,
    // id は付与済み
    lines: lines as InlineWithId[][],
    splitable: true,
    style: block.style,
    label: block.label,
    // id は付与済み
    id: block.id!,
  };
  return text;
};

/**
 * 数式を処理する
 */
const convertMathBlock = async (
  block: MathBlock,
  blockStyles: BlockStyleList
) => {
  const size =
    block.style?.size ?? blockStyles.math?.size ?? blockStyles.paragraph.size;
  const { svg, width } = texToSvg(block.lines.join("\n"), size);
  const filename = `${TMP_DIR}/${uuidV4()}.svg`;
  writeFileSync(filename, svg);

  const figure: FigureWithId = {
    type: "figure",
    src: filename,
    label: block.label,
    // id は付与済み
    id: block.id!,
    style: {
      width: width,
      align: "center",
    },
  };
  return figure;
};

/**
 * 表を処理する
 */
const convertTable = (block: Table) => {
  // 列数が一致するかを確認
  if (block.rows.length === 0) {
    displayWarning(
      "A table must have at least one row. This table will be ignored."
    );
    return null;
  }
  const columnCount = block.rows[0].length;
  for (const row of block.rows) {
    if (row.length !== columnCount) {
      displayWarning(
        "The number of all columns must be the same. This table will be ignored."
      );
      return null;
    }
  }
  return block as TableWithId;
};
