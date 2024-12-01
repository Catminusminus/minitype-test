import { TempCharInfo } from "@/lib/inline.js";

// 文字クラス
export type CharClass =
  | "openingBracket" // 開き括弧類
  | "closingBracket" // 閉じ括弧類
  | "comma" // 読点
  | "period" // 句点
  | "middleDot" // 中点
  | "kana" // かな
  | "sutegana" // 捨て仮名
  | "latin" // 欧文
  | "space" // 空白
  | "dividing" // 区切り文字
  | "prolongedSound" // 長音
  | "lineHead" // 行頭
  | "lineTail" // 行末
  | "others"
  | "fallback";

// 始め括弧類
const OPENING_BRACKET = [
  "「",
  "（",
  "【",
  "『",
  "［",
  "｛",
  "〈",
  "《",
  "〔",
  "〚",
  "〖",
  "〘",
];

// 終わり括弧類
const CLOSING_BRACKET = [
  "」",
  "）",
  "】",
  "』",
  "］",
  "｝",
  "〉",
  "》",
  "〕",
  "〛",
  "〗",
  "〙",
];

// 読点・句点類
const COMMA = ["、", "，"];
const PERIOD = ["。", "．"];

// 中点類
const MIDDLE_DOT = ["・", "：", "；"];

// 行頭禁則文字
const NOT_BEGINNING: CharClass[] = [
  "closingBracket",
  "comma",
  "period",
  "middleDot",
  "sutegana",
  "dividing",
  "prolongedSound",
];

// 行末禁則文字
const NOT_ENDING: CharClass[] = ["openingBracket"];

// 分割禁止
const INSEPARABLE_CHAR = [
  "—", // U+2014 EM DASH
  "―", // U+2015 HORIZONTAL BAR
  "…",
  "‥",
];
const INSEPARABLE_CLASS: CharClass[] = ["latin"];

/**
 * 文字クラスを判定する
 */
export const classifyCharClass = (char: string): CharClass => {
  if (OPENING_BRACKET.includes(char)) {
    return "openingBracket";
  }
  if (CLOSING_BRACKET.includes(char)) {
    return "closingBracket";
  }
  if (COMMA.includes(char)) {
    return "comma";
  }
  if (PERIOD.includes(char)) {
    return "period";
  }
  if (MIDDLE_DOT.includes(char)) {
    return "middleDot";
  }
  if (
    "ぁぃぅぇぉっゃゅょゎァィゥェォヵㇰヶㇱㇲッㇳㇴㇵㇶㇷㇷ゚ㇸㇹㇺャュョㇻㇼㇽㇾㇿヮ".includes(
      char,
    )
  ) {
    return "sutegana";
  }
  if (/^[ぁ-んァ-ヶ]$/.test(char)) {
    return "kana";
  }
  if (/^[a-zA-Z0-9\-_–.,!?:;()\[\]<>{}/\\@'"`#*]$/.test(char)) {
    return "latin";
  }
  if (/^[ 　]$/.test(char)) {
    return "space";
  }
  if ("！？".includes(char)) {
    return "dividing";
  }
  if (char === "ー") {
    return "prolongedSound";
  }
  return "others";
};

/**
 * ホワイトスペースかを判定する
 */
const isWhiteSpace = (char: string) => {
  return " \t".includes(char);
};

/**
 * 和欧間スペースを削除する
 */
export const removeJaEnSpaces = (line: TempCharInfo[]) => {
  const removed: TempCharInfo[] = [];

  for (let i = 0; i < line.length; i++) {
    if (i > 0 && i < line.length - 1 && isWhiteSpace(line[i].char)) {
      const prevClass = classifyCharClass(line[i - 1].char);
      const nextClass = classifyCharClass(line[i + 1].char);
      if (
        (prevClass === "latin" &&
          nextClass !== "latin" &&
          nextClass !== "space") ||
        (prevClass !== "latin" &&
          prevClass !== "space" &&
          nextClass === "latin")
      ) {
        continue;
      }
    }
    removed.push(line[i]);
  }
  return removed;
};

// 冒頭のホワイトスペースを削除する
export const trimStartSpaces = (line: TempCharInfo[]) => {
  const index = line.findIndex(({ char }) => !isWhiteSpace(char));
  return index > -1 ? index : 0;
};

// 末尾のホワイトスペースを削除する
export const trimEndSpaces = (line: TempCharInfo[]) => {
  for (let i = line.length; i > 0; i--) {
    if (!isWhiteSpace(line[i - 1].char)) {
      return i;
    }
  }
  return 0;
};

/**
 * 分割可能であるかを判定する
 */
export const canSplit = (prev: string, next: string) => {
  const prevClass = classifyCharClass(prev);
  const nextClass = classifyCharClass(next);
  return (
    !NOT_ENDING.includes(prevClass) &&
    !NOT_BEGINNING.includes(nextClass) &&
    // 分割禁止
    !(INSEPARABLE_CHAR.includes(prev) && INSEPARABLE_CHAR.includes(next)) &&
    !(
      INSEPARABLE_CLASS.includes(prevClass) &&
      INSEPARABLE_CLASS.includes(nextClass)
    )
  );
};

/**
 * トラッキングを挿入可能かを判定する
 */
export const canInsertTracking = (prev: string, next: string) => {
  const prevClass = classifyCharClass(prev);
  const nextClass = classifyCharClass(next);
  return (
    !(INSEPARABLE_CHAR.includes(prev) && INSEPARABLE_CHAR.includes(next)) &&
    !(
      INSEPARABLE_CLASS.includes(prevClass) &&
      INSEPARABLE_CLASS.includes(nextClass)
    )
  );
};
