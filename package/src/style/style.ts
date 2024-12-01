import {
  Block,
  BoxInfo,
  FigureWithId,
  FlowTextSubType,
  TableInfo,
  TextInfo,
  TextSubType,
} from "@/lib/block.js";
import { Inline, isCommand } from "@/lib/inline.js";
import { TextSpace } from "@/typesetting/typesetter.js";
import {
  Align,
  Color,
  Em,
  Margin,
  Padding,
  PageSize,
  Ratio,
  Shorthand,
  TextAlign,
} from "./figure.js";

export type DocumentStyle = {
  size: PageSize;
  padding: Padding;
  block: BlockStyleList;
  command?: CommandStyleRecord;
  gap: Gap[];
};

export interface BlockStyleList {
  paragraph: TextStyle;
  headings?:
    | [Partial<TextStyle>]
    | [Partial<TextStyle>, Partial<TextStyle>]
    | [Partial<TextStyle>, Partial<TextStyle>, Partial<TextStyle>]
    | [
        Partial<TextStyle>,
        Partial<TextStyle>,
        Partial<TextStyle>,
        Partial<TextStyle>
      ];
  code?: Partial<TextStyle>;
  list?: ListStyle;
  figure?: FigureStyle;
  math?: MathStyle;
  table?: TableStyle;
  caption?: Partial<TextStyle>;
  footnote?: Partial<TextStyle>;
  pillar?: Partial<TextStyle>;
  nombre?: Partial<TextStyle>;
  box?: Record<string, BoxStyle>;
}

export type CommandStyleRecord = Record<string, CommandStyle>;

export type TextStyle = {
  lineHeight: number;
  align?: TextAlign | ((pageIndex: number) => TextAlign);
  indent?: number | Em;
  firstIndent?: number | Em;
  pre?: boolean;
  space?: TextSpace;
} & InlineStyle;

export type ListStyle = Partial<TextStyle> & {
  item?: (level: 1 | 2 | 3) => string;
};

export type FigureStyle = {
  width?: number | Ratio;
  align?: Align;
};

export type MathStyle = {
  size?: number;
};

export type TableStyle = {
  align?: Align;

  // セル
  lineHeight?: (index: number) => number;
  indent?: (index: number) => number | Em;
  firstIndent?: (index: number) => number | Em;
  pre?: (index: number) => boolean;
  space?: (index: number) => TextSpace;
  padding?: (index: number) => Padding;
  background?: (index: number) => Color;

  // CharStyle
  size?: (index: number) => number;
  font?: (index: number) => string;
  color?: (index: number) => Color;
  baseline?: (index: number) => number;
};

export type CommandStyle = {
  width?: number | ((indent: Indent) => number);
} & Partial<InlineStyle>;

export type InlineStyle = CharStyle & BoxStyle;

export type CharStyle = {
  size: number;
  font: string;
  color: Color;
  baseline?: number;
};

export type BoxStyle = {
  margin?: Margin;
  padding?: Padding;
} & Decoration;

export interface Decoration {
  background?: Color;
  border?: AllBorder;
  borderRadius?: number;
}

export type AllBorder = Shorthand<Border>;

export interface Border {
  width: number;
  color: Color;
}

export type GapBlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "code"
  | "list1"
  | "list2"
  | "list3"
  | "figure"
  | "table"
  | "caption"
  | "footnote"
  | { type: "box"; name: string }
  | "fallback";

export type Gap = [GapBlockType, GapBlockType, number];

export interface Indent {
  normal: number;
  first: number;
}

// スタイルの合成
export const mixTextStyle = (
  main: Partial<TextStyle>,
  base: TextStyle
): TextStyle => {
  return {
    // TextStyle
    lineHeight: main.lineHeight ?? base.lineHeight,
    align: main.align ?? base.align,
    indent: main.indent ?? base.indent,
    firstIndent: main.firstIndent ?? base.firstIndent,
    pre: main.pre ?? base.pre,
    space: main.space ?? base.space,
    // InlineStyle
    // TextStyle の InlineStyle は Partial ではない
    ...(mixInlineStyle(main, base) as InlineStyle),
  };
};

export const mixCommandStyle = (
  main: Partial<CommandStyle>,
  base: CommandStyle
): CommandStyle => {
  return {
    width: main.width ?? base.width,
    // InlineStyle
    ...mixInlineStyle(main, base),
  };
};

const mixInlineStyle = (
  main: Partial<InlineStyle>,
  base: Partial<InlineStyle>
): Partial<InlineStyle> => {
  return {
    size: main.size ?? base.size,
    font: main.font ?? base.font,
    color: main.color ?? base.color,
    baseline: main.baseline ?? base.baseline,
    // BoxStyle
    margin: main.margin ?? base.margin,
    padding: main.padding ?? base.padding,
    // Decoration
    background: main.background ?? base.background,
    border: main.border ?? base.border,
    borderRadius: main.borderRadius ?? base.borderRadius,
  };
};

export const mixCharStyle = (main: Partial<CharStyle>, base: CharStyle) => {
  return {
    size: main.size ?? base.size,
    font: main.font ?? base.font,
    color: main.color ?? base.color,
    baseline: main.baseline ?? base.baseline,
  };
};

export const mixFigureStyle = (
  main: FigureStyle,
  base: FigureStyle
): FigureStyle => {
  return {
    width: main.width ?? base.width,
    align: main.align ?? base.align,
  };
};

export const mixTableStyle = (
  main: TableStyle,
  base: TableStyle
): TableStyle => {
  return {
    align: main.align ?? base.align,

    // セル
    lineHeight: main.lineHeight ?? base.lineHeight,
    indent: main.indent ?? base.indent,
    firstIndent: main.firstIndent ?? base.firstIndent,
    pre: main.pre ?? base.pre,
    space: main.space ?? base.space,
    padding: main.padding ?? base.padding,
    background: main.background ?? base.background,

    // CharStyle
    size: main.size ?? base.size,
    font: main.font ?? base.font,
    color: main.color ?? base.color,
    baseline: main.baseline ?? base.baseline,
  };
};

export const getTextStyle = (
  subtype: TextSubType | FlowTextSubType,
  styles: BlockStyleList
): TextStyle => {
  if (
    subtype === "code" ||
    subtype === "caption" ||
    subtype === "pillar" ||
    subtype === "nombre" ||
    subtype === "footnote"
  ) {
    return mixTextStyle(styles[subtype] ?? {}, styles.paragraph);
  }

  // リスト
  if (subtype === "list1" || subtype === "list2" || subtype === "list3") {
    return mixTextStyle(styles.list ?? {}, styles.paragraph);
  }

  // 見出し
  if (subtype.startsWith("h")) {
    const level = parseInt(subtype.slice(1)) - 1;
    if (styles.headings?.[level]) {
      return mixTextStyle(styles.headings[level], styles.paragraph);
    }
  }

  return styles.paragraph;
};

export const getTableTextStyle = (
  mixedStyle: TableStyle,
  paragraph: TextStyle,
  yi: number
): TextStyle => {
  return {
    lineHeight: mixedStyle.lineHeight?.(yi) ?? paragraph.lineHeight,

    // セル
    align: paragraph.align,
    indent: mixedStyle.indent?.(yi),
    firstIndent: mixedStyle.indent?.(yi),
    pre: mixedStyle.pre?.(yi),
    space: mixedStyle.space?.(yi) ?? paragraph.space,

    // CharStyle
    size: mixedStyle.size?.(yi) ?? paragraph.size,
    font: mixedStyle.font?.(yi) ?? paragraph.font,
    color: mixedStyle.color?.(yi) ?? paragraph.color,
    baseline: mixedStyle.baseline?.(yi) ?? paragraph.baseline,
  };
};

export const textToInlineStyleWithoutBoxStyle = (
  textStyle: TextStyle
): InlineStyle => {
  // BoxStyle は除外する
  return {
    size: textStyle.size,
    font: textStyle.font,
    color: textStyle.color,
    baseline: textStyle.baseline,
  };
};

// Gap
export const getGapBlockType = (
  blockInfo: TextInfo | FigureWithId | TableInfo | BoxInfo
): GapBlockType => {
  if (blockInfo.type === "text") {
    return blockInfo.subtype;
  }
  if (blockInfo.type === "figure") {
    return "figure";
  }
  if (blockInfo.type === "table") {
    return "table";
  }
  // ボックス
  return { type: "box", name: blockInfo.name };
};

export const getGap = (
  previous: GapBlockType,
  next: GapBlockType,
  gaps: Gap[]
): number => {
  const equalsKey = (a: GapBlockType, b: GapBlockType) =>
    (Array.isArray(a) && Array.isArray(b) && a[0] === b[0] && a[1] === b[1]) ||
    (typeof a === "string" && typeof b === "string" && a === b);

  for (const gap of gaps) {
    if (
      (equalsKey(gap[0], previous) || gap[0] === "fallback") &&
      (equalsKey(gap[1], next) || gap[1] === "fallback")
    ) {
      return gap[2];
    }
  }
  return 0;
};

export const drawsDecoration = (decoration: Decoration) => {
  return (
    decoration.background ||
    decoration.border?.top ||
    decoration.border?.right ||
    decoration.border?.bottom ||
    decoration.border?.left
  );
};

/**
 * 出現するフォント名のリストを取得する
 */
export const collectFontSrcs = (
  body: Block[],
  style: DocumentStyle
): string[] => {
  const srcs = new Set<string>();

  // ブロックスタイル
  const blockStyles = [
    style.block.paragraph,
    style.block.code,
    style.block.caption,
    style.block.footnote,
    style.block.pillar,
    style.block.nombre,
  ];
  if (style.block.headings) {
    blockStyles.push(...style.block.headings);
  }
  for (const blockStyle of blockStyles) {
    if (blockStyle?.font) {
      srcs.add(blockStyle?.font);
    }
  }

  // 表
  if (style.block.table?.font) {
    // TODO: 一旦 100 行としているが、これ以上の場合にも対応する必要がある
    for (let i = 0; i < 100; i++) {
      srcs.add(style.block.table.font(i));
    }
  }

  // コマンドスタイル
  for (const commandStyle of Object.values(style.command ?? {})) {
    if (commandStyle.font) {
      srcs.add(commandStyle.font);
    }
  }

  const loadBlocks = (blocks: Block[]) => {
    for (const block of blocks) {
      if (
        "style" in block &&
        block.style &&
        "font" in block.style &&
        block.style.font
      ) {
        if (block.type === "table") {
          // TODO: 一旦 100 行としているが、これ以上の場合にも対応する必要がある
          for (let i = 0; i < 100; i++) {
            srcs.add(block.style.font(i));
          }
        } else {
          srcs.add(block.style.font);
        }
      }

      // インラインを探索
      if ("lines" in block) {
        for (const line of block.lines) {
          if (Array.isArray(line)) {
            loadInlines(line);
          }
        }
      }
      if (block.type === "table") {
        for (const row of block.rows) {
          for (const cell of row) {
            for (const line of cell) {
              loadInlines(line);
            }
          }
        }
      }

      // 再帰的に探索
      if (block.type === "box") {
        loadBlocks(block.blocks);
      }
    }
  };

  const loadInlines = (inlines: Inline[]) => {
    for (const inline of inlines) {
      if (isCommand(inline)) {
        if (inline.style?.font) {
          srcs.add(inline.style.font);
        }
        // 再帰的に探索
        loadInlines(inline.body);
      }
    }
  };

  // ブロック・インラインへの直接指定
  loadBlocks(body);

  return [...srcs];
};
