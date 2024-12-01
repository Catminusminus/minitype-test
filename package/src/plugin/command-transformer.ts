import { Link } from "@/lib/inline.js";
import { CommandTransformer } from "@/plugin/index.js";

const undefinedLabel = "??";

/**
 * ref コマンドを参照番号に変換する
 */
export const refTransformer: CommandTransformer = (command, { labelMap }) => {
  if (command.name !== "ref" || typeof command.body[0] !== "string") {
    return;
  }
  const label =
    labelMap.block.label[command.body[0]] || labelMap.block.id[command.body[0]];

  if (label) {
    command.body = [label.index?.toString()];
    command.link = {
      type: "destination",
      destination: label.id,
    };
  } else {
    command.body = [undefinedLabel];
  }
};

/**
 * pageref コマンドを参照先のページ番号に変換する
 */
export const pageRefTransformer: CommandTransformer = (
  command,
  { labelMap },
) => {
  if (command.name !== "pageref" || typeof command.body[0] !== "string") {
    return;
  }
  const label =
    labelMap.block.label[command.body[0]] || labelMap.block.id[command.body[0]];
  command.body = [label?.pageIndex?.toString() ?? undefinedLabel];
};

/**
 * autoref コマンドを参照先のタイプ + 番号（例：図 n）に変換する
 */
export const autorefTransformer: CommandTransformer = (
  command,
  { labelMap },
) => {
  if (command.name !== "autoref" || typeof command.body[0] !== "string") {
    return;
  }
  const label =
    labelMap.block.label[command.body[0]] || labelMap.block.id[command.body[0]];

  if (!label) {
    command.body = [undefinedLabel];
    return;
  }
  const destination: Link = {
    type: "destination",
    destination: label.id,
  };

  if (label.type === "heading") {
    command.body = [`${label.index.toString()}章`];
    command.link = destination;
  }
  if (
    label.type === "figure" ||
    label.type === "code" ||
    label.type === "math"
  ) {
    const type = {
      figure: "図",
      code: "ソースコード",
      math: "式",
    }[label.type];
    command.body = [`${type}${label.index.toString()}`];
    command.link = destination;
  }
};

/**
 * page コマンドをページ番号に変換する
 */
export const pageTransformer: CommandTransformer = (
  command,
  { labelMap, blockOperation },
) => {
  if (command.name !== "page") {
    return;
  }
  command.body = [
    labelMap.block.id[blockOperation.block.id!]?.pageIndex?.toString() ?? "??",
  ];
};

/**
 * fn コマンドを脚注番号に変換する
 * @param pattern 脚注番号のパターン。$ は脚注番号に置換される。デフォルトは *$
 */
export const fnTransformer = (pattern?: string): CommandTransformer => {
  const splitedPattern = (pattern ?? "*$").split("$");
  const before = splitedPattern[0];
  const after = splitedPattern[1] ?? "";

  return (command, { labelMap }) => {
    if (command.name !== "fn" || typeof command.body[0] !== "string") {
      return;
    }
    const label = labelMap.block.label[command.body[0]];
    if (label) {
      command.body = [`${before}${label.index}${after}`];
      command.link = {
        type: "destination",
        destination: label.id,
      };
    }
  };
};

/**
 * url コマンドをリンクに変換する
 */
export const urlTransformer: CommandTransformer = (command) => {
  if (command.name !== "url" || !command.attrs?.[0]) {
    return;
  }
  command.link = {
    type: "url",
    url: command.attrs[0],
  };
};
