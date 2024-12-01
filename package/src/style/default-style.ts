import { TEXT_SPACE_FULL } from "@/index.js";
import { FlowTextSubType, TextSubType } from "@/lib/block.js";
import { Align, Em, TextAlign, em } from "./figure.js";

export const DEFAULT_TEXT_ALIGN: TextAlign = "justify";
export const DEFAULT_TEXT_SPACE = () => TEXT_SPACE_FULL;
const DEFAULT_FOOTNOTE_INDENT_EM = 2;

// リスト
export const DEFAULT_LIST_ITEM = "・";
const DEFAULT_LIST_INDENT_EM = 2;

// 図
export const DEFAULT_FIGURE_RATIO = 0.8;
export const DEFAULT_FIGURE_ALIGN: Align = "center";

// 表
export const DEFAULT_TABLE_ALIGN: Align = "center";
export const DEFAULT_TABLE_INDENT = 0;
export const DEFAULT_TABLE_FIRST_INDENT = 0;
export const DEFAULT_TABLE_PRE = false;

export const getDefaultIndent = (
  subtype: TextSubType | FlowTextSubType,
): number | Em => {
  switch (subtype) {
    case "list1":
      return em(DEFAULT_LIST_INDENT_EM);
    case "list2":
      return em(DEFAULT_LIST_INDENT_EM * 2);
    case "list3":
      return em(DEFAULT_LIST_INDENT_EM * 3);
    case "footnote":
      return em(DEFAULT_FOOTNOTE_INDENT_EM);
    default:
      return 0;
  }
};

export const getDefaultFirstIndent = (
  subtype: TextSubType | FlowTextSubType,
): number | Em => {
  if (subtype.startsWith("list")) {
    return em(-1);
  }
  if (subtype === "footnote") {
    return em(-DEFAULT_FOOTNOTE_INDENT_EM);
  }
  return 0;
};

export const getDefaultPre = (
  subtype: TextSubType | FlowTextSubType,
): boolean => {
  return subtype === "code";
};
