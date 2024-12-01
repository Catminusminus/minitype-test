import { getAdvanceWidth } from "@/lib/font.js";
import { TempCharInfo } from "@/lib/inline.js";
import { TextAlign } from "@/style/figure.js";
import { Indent } from "@/style/style.js";
import {
  CharClass,
  canInsertTracking,
  canSplit,
  classifyCharClass,
} from "./char-class.js";

export type TextSpace = Partial<
  Record<CharClass, Partial<Record<CharClass, number>>>
>;

interface HorizontalSpace {
  marginLeft: number;
  paddingLeft: number;
  marginRight: number;
  paddingRight: number;
}

// 文字アキ量設定
/**
 * 約物全角の文字アキ量設定
 */
export const TEXT_SPACE_FULL: TextSpace = {
  closingBracket: {
    closingBracket: 0,
    comma: 0,
    period: 0,
    fallback: 0.5,
  },
  comma: {
    closingBracket: 0,
    fallback: 0.5,
  },
  period: {
    closingBracket: 0,
    fallback: 0.5,
  },
  middleDot: {
    fallback: 0.25,
  },
  kana: {
    latin: 0.25,
  },
  sutegana: {
    latin: 0.25,
  },
  latin: {
    kana: 0.25,
    sutegana: 0.25,
    prolongedSound: 0.25,
    lineTail: 0,
    others: 0.25,
  },
  prolongedSound: {
    latin: 0.25,
  },
  others: {
    latin: 0.25,
  },
  fallback: {
    openingBracket: 0.5,
    middleDot: 0.25,
  },
} as const;

/**
 * 約物半角の文字アキ量設定
 */
export const TEXT_SPACE_HALF: TextSpace = {
  kana: {
    latin: 0.25,
  },
  sutegana: {
    latin: 0.25,
  },
  latin: {
    kana: 0.25,
    sutegana: 0.25,
    lineTail: 0,
    prolongedSound: 0.25,
    others: 0.25,
  },
  prolongedSound: {
    latin: 0.25,
  },
  others: {
    latin: 0.25,
  },
} as const;

/**
 * 行頭行末半角の文字アキ量設定
 */
export const TEXT_SPACE_HEADTAIL_HALF: TextSpace = {
  closingBracket: {
    closingBracket: 0,
    comma: 0,
    period: 0,
    lineTail: 0,
    fallback: 0.5,
  },
  comma: {
    closingBracket: 0,
    lineTail: 0,
    fallback: 0.5,
  },
  period: {
    closingBracket: 0,
    lineTail: 0,
    fallback: 0.5,
  },
  middleDot: {
    lineTail: 0,
    fallback: 0.25,
  },
  kana: {
    latin: 0.25,
  },
  sutegana: {
    latin: 0.25,
  },
  latin: {
    kana: 0.25,
    sutegana: 0.25,
    prolongedSound: 0.25,
    lineTail: 0,
    others: 0.25,
  },
  prolongedSound: {
    latin: 0.25,
  },
  lineHead: {
    openingBracket: 0,
  },
  others: {
    latin: 0.25,
  },
  fallback: {
    openingBracket: 0.5,
    middleDot: 0.25,
  },
} as const;

/**
 * アキを除いた文字幅と位置を取得する
 */
const getCharInfoWithoutSpace = (tempCharInfo: TempCharInfo) => {
  const { char, style } = tempCharInfo;
  const charClass = classifyCharClass(char);
  const advanceWidth = getAdvanceWidth(char, style.font);

  const isHalf =
    charClass === "openingBracket" ||
    charClass === "closingBracket" ||
    charClass === "comma" ||
    charClass === "period" ||
    charClass === "middleDot";

  if (isHalf) {
    const HALF_WIDTH = 0.5;
    const width = Math.min(advanceWidth, HALF_WIDTH);
    const isCenter = ["middleDot"].includes(charClass);
    const isRight = ["openingBracket"].includes(charClass);
    const x =
      (advanceWidth - HALF_WIDTH) *
      (isCenter ? 0.5 : isRight ? 1.0 : 0) *
      style.size;
    return {
      x,
      width: width * style.size,
    };
  }
  return { x: 0, width: advanceWidth * style.size };
};

/**
 * アキ量を取得する
 */
const getCharSpace = (
  prev: string | null,
  next: string | null,
  space: TextSpace,
): number => {
  const prevClass = prev === null ? "lineHead" : classifyCharClass(prev);
  const nextClass = next === null ? "lineTail" : classifyCharClass(next);

  const prevSpace = space[prevClass];
  const fallbackSpace = space.fallback;
  if (prevSpace) {
    const prevNextSpace = prevSpace[nextClass];
    if (prevNextSpace !== undefined) {
      return prevNextSpace;
    }
    if (prevSpace.fallback !== undefined) {
      return prevSpace.fallback;
    }
  }
  return fallbackSpace
    ? fallbackSpace[nextClass] ?? fallbackSpace.fallback ?? 0
    : 0;
};

/**
 * 行分割処理を行い、分割すべきインデックスを返す
 */
export const getSplitIndex = (
  line: TempCharInfo[],
  width: number,
  indent: Indent,
  space: TextSpace,
) => {
  const inlineWidth = new InlineWidthCalculator(indent);
  let lineWidth = 0;
  let toLeftNextSpace = true;

  for (let i = 0; i < line.length; i++) {
    // calculateCharPositions と共通の処理を行う
    const charInfo = getCharInfoWithoutSpace(line[i]);
    inlineWidth.push(line[i], lineWidth);

    const charSpace = toLeftNextSpace
      ? getCharSpace(line[i - 1]?.char ?? null, line[i].char, space) *
        line[i].style.size
      : 0;
    const result = inlineWidth.calculateCharWidth(
      line[i],
      lineWidth,
      charInfo.width,
    );
    const charWidth = result[0];
    toLeftNextSpace = result[1];

    const { marginLeft, paddingLeft, marginRight, paddingRight } =
      getHorizontalSpace(line[i], i === 0, false);

    // 追い出し処理
    if (
      lineWidth + marginLeft + paddingLeft + charInfo.width + paddingRight >
        width &&
      i > 0
    ) {
      let index = i;
      while (index > 0) {
        if (canSplit(line[index - 1]?.char, line[index].char)) {
          return index;
        }
        index--;
      }
      return i;
    }

    lineWidth +=
      marginLeft +
      paddingLeft +
      charWidth +
      charSpace +
      paddingRight +
      marginRight;
  }

  return line.length;

  // TODO: ぶら下がり
  // TODO: 追い込み処理
};

/**
 * 文字の位置を計算する
 */
export const calculateCharPositions = (
  line: TempCharInfo[],
  width: number,
  align: TextAlign,
  left: number,
  ends: boolean,
  baseSize: number,
  indent: Indent,
  space: TextSpace,
) => {
  const alignRatio = align === "right" ? 1 : align === "center" ? 0.5 : 0;

  const separables: boolean[] = [];
  const charXList: number[] = [];
  const charWidths: number[] = [];
  const charSpaces: number[] = [];
  const HorizontalSpaces: HorizontalSpace[] = [];

  const inlineWidth = new InlineWidthCalculator(indent);
  let lineWidth = 0;
  let toLeftNextSpace = true;

  // 行長（トラッキングなし）の算出
  for (let i = 0; i < line.length; i++) {
    // getSplitIndex と共通の処理を行う
    const charInfo = getCharInfoWithoutSpace(line[i]);
    inlineWidth.push(line[i], lineWidth);

    const charSpace = toLeftNextSpace
      ? getCharSpace(line[i - 1]?.char ?? null, line[i].char, space) *
        line[i].style.size
      : 0;
    const result = inlineWidth.calculateCharWidth(
      line[i],
      lineWidth,
      charInfo.width,
    );
    const charWidth = result[0];
    toLeftNextSpace = result[1];

    const HorizontalSpace = getHorizontalSpace(line[i], i === 0, false);

    charXList.push(charInfo.x);
    charWidths.push(charWidth);
    charSpaces.push(charSpace);
    HorizontalSpaces.push(HorizontalSpace);
    separables.push(canInsertTracking(line[i].char, line[i + 1]?.char));

    const { marginLeft, paddingLeft, marginRight, paddingRight } =
      HorizontalSpace;

    lineWidth +=
      marginLeft +
      paddingLeft +
      charWidth +
      charSpace +
      paddingRight +
      marginRight;

    // 末尾の場合、行末アキを追加
    if (i === line.length - 1) {
      lineWidth += getCharSpace(line[i].char, null, space) * line[i].style.size;
    }
  }

  // トラッキングを計算
  const separableCount = separables.filter((v) => v).length - 1;
  const tracking =
    align === "justify" && !ends && separableCount > 0
      ? (width - lineWidth) / separableCount
      : 0;

  const positions: { x: number; y: number; width: number }[] = [];
  let x = (width - lineWidth) * alignRatio + left;

  for (let i = 0; i < line.length; i++) {
    const size = line[i].style.size;
    const { marginLeft, paddingLeft, marginRight, paddingRight } =
      HorizontalSpaces[i];
    const left = marginLeft + paddingLeft;
    const right = marginRight + paddingRight;

    // ベースラインに揃える
    const y = (baseSize - size) * 0.88 - (line[i].style.baseline ?? 0);

    positions.push({
      x: x + left - charXList[i] + charSpaces[i],
      y,
      width: charWidths[i],
    });
    x +=
      left +
      charWidths[i] +
      charSpaces[i] +
      right +
      (separables[i] ? tracking : 0);
  }
  return positions;
};

/**
 * マージン、パディングを計算する
 */
const getHorizontalSpace = (
  tempCharInfo: TempCharInfo,
  starts: boolean,
  ends: boolean,
): HorizontalSpace => {
  const { orderedCommands } = tempCharInfo;
  let marginLeft = 0;
  let paddingLeft = 0;
  let marginRight = 0;
  let paddingRight = 0;

  for (const orderedCommand of orderedCommands) {
    const { command, position } = orderedCommand;

    const inlineStarts = position.includes("start");
    const inlineEnds = position.includes("end");

    marginLeft = Math.max(
      inlineStarts && !starts ? command.style?.margin?.left ?? 0 : 0,
      marginLeft,
    );
    paddingLeft = Math.max(
      inlineStarts ? command.style?.padding?.left ?? 0 : 0,
      paddingLeft,
    );
    marginRight = Math.max(
      inlineEnds && !ends ? command.style?.margin?.right ?? 0 : 0,
      marginRight,
    );
    paddingRight = Math.max(
      inlineEnds ? command.style?.padding?.right ?? 0 : 0,
      paddingRight,
    );
  }

  return {
    marginLeft,
    paddingLeft,
    marginRight,
    paddingRight,
  };
};

/**
 * インデントの幅を計算する
 */
class InlineWidthCalculator {
  private commandIdToCharX: Record<string, number> = {};

  constructor(private indent: Indent) {}

  push(tempCharInfo: TempCharInfo, x: number) {
    // コマンド開始位置の x 座標を記録
    for (const { command, position } of tempCharInfo.orderedCommands) {
      if (position.includes("start")) {
        this.commandIdToCharX[command.id] = x;
      }
    }
  }

  /**
   * 最後の文字の最終的な幅を取得する
   */
  calculateCharWidth(
    tempCharInfo: TempCharInfo,
    x: number,
    charWidth: number,
  ): [number, boolean] {
    let width = charWidth;
    for (const { command, position } of tempCharInfo.orderedCommands) {
      if (position.includes("end") && command.style?.width !== undefined) {
        const commandWidth =
          typeof command.style.width === "number"
            ? command.style.width
            : command.style.width(this.indent);
        width = Math.max(
          commandWidth - (x - this.commandIdToCharX[command.id]),
          width,
        );
      }
    }

    // `toLeftNextSpace` が false の場合、後続するスペースを削除する
    // TODO: 「「」を含む場合、インデント後の文字が右にずれる
    const toLeftNextSpace = width <= charWidth;

    return [width, toLeftNextSpace];
  }
}
