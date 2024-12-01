import { BlockTransformer } from "@/plugin/index.js";

/**
 * h2 以下の見出しの先頭に番号を付与する
 */
export const headingTransformer: BlockTransformer = (block, { labelMap }) => {
  if (block.type !== "heading" || block.level === 1) {
    return;
  }
  const label = labelMap.block.id[block.id!];
  if (!label || typeof label.index === "number") {
    return;
  }
  const countStr = label.index
    .slice(1, block.level)
    .map((n) => n)
    .join(".");
  block.lines[0].unshift(`${countStr}.`);
};

/**
 * caption の先頭に番号を付与する
 */
export const captionTransformer: BlockTransformer = (
  block,
  { blockOperation },
) => {
  const prevBlock = blockOperation.prev;
  if (block.type !== "caption" || !prevBlock) {
    return;
  }
  block.lines[0].unshift(
    {
      name: "autoref",
      body: [prevBlock.block.id!],
    },
    "：",
  );
};

/**
 * footnote の先頭に番号を付与する
 * @param pattern 脚注番号のパターン。$ は脚注番号に置換される。デフォルトは *$
 */
export const footnoteTransformer = (pattern?: string): BlockTransformer => {
  const splitedPattern = (pattern ?? "*$").split("$");
  const before = splitedPattern[0];
  const after = splitedPattern[1] ?? "";

  return (block) => {
    if (block.type !== "footnote") {
      return;
    }
    block.lines[0].unshift({
      name: "footnote-no",
      body: [
        before,
        {
          name: "ref",
          body: [`${block.label}`],
        },
        after,
      ],
      style: {
        width: (indent) => indent.normal,
      },
    });
  };
};
