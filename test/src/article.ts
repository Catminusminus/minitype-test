import {
  BlockStyleList,
  CommandStyleRecord,
  Gap,
  autorefTransformer,
  captionTransformer,
  cmyk,
  fnTransformer,
  footnoteTransformer,
  minitype,
  pageRefTransformer,
  pageTransformer,
  refTransformer,
  referenceExtender,
  shorthand,
  urlTransformer,
} from "minitype";
import { body } from "./article-body.js";

const width = 210;

// 幅を整数倍に合わせる
const paragraphSize = 3.5;
const bodyWidth = Math.floor((210 - 30 * 2) / paragraphSize) * paragraphSize;
const padding = (() => {
  const horizontal = (width - bodyWidth) / 2;
  return {
    top: 32,
    right: horizontal,
    bottom: 30,
    left: horizontal,
  };
})();

const blockStyles: BlockStyleList = {
  paragraph: {
    size: paragraphSize,
    lineHeight: paragraphSize * 1.8,
    firstIndent: paragraphSize,
    font: "AP-SK-IshiiGothicStdN-M",
    color: cmyk(0, 0, 0, 100),
  },
  pillar: {
    firstIndent: 0,
    align: (pageIndex: number) => (pageIndex % 2 === 1 ? "left" : "right"),
    margin: shorthand([-8, 0, 0, 0]),
    padding: shorthand([3, 0]),
    border: { bottom: { width: 0.2, color: cmyk(0, 0, 0, 80) } },
  },
  nombre: {
    firstIndent: 0,
    align: "center",
    margin: shorthand([6, -3, 0, -3]),
    padding: shorthand([3]),
  },
  figure: {
    align: "center",
    width: bodyWidth * 0.9,
  },
  headings: [
    {
      size: 8,
      lineHeight: 8 * 1.5,
      font: "A-SK-GonaMin2-E",
      firstIndent: 0,
      margin: { left: 1 },
      padding: shorthand([4, 0, 4, 8]),
      border: { left: { width: 2, color: cmyk(0, 0, 0, 80) } },
    },
    {
      size: 6,
      lineHeight: 6 * 1.8,
      font: "A-SK-GonaMin2-E",
      firstIndent: 0,
    },
    {
      size: 4,
      lineHeight: 4 * 1.8,
      font: "A-SK-GonaMin2-E",
      firstIndent: 0,
    },
    {
      font: "A-SK-GonaMin2-E",
      firstIndent: 0,
    },
  ],
  list: {
    item: () => "・",
    firstIndent: -3,
  },
  code: {
    align: "left",
    size: 3.5,
    lineHeight: 3.5 * 1.8,
    font: "SourceHanCodeJP-Normal",
    firstIndent: 0,
    margin: shorthand([0, -4]),
    padding: shorthand([4]),
    border: shorthand([
      { width: 0.2, color: cmyk(0, 0, 0, 80) },
      { width: 0.2, color: cmyk(0, 0, 0, 80) },
    ]),
  },
  caption: {
    align: "center",
    firstIndent: 0,
  },
  footnote: {
    size: 3,
    lineHeight: 3 * 1.6,
    firstIndent: 0,
  },
};

const commandStyles: CommandStyleRecord = {
  b: {
    font: "AP-SK-IshiiGothicStdN-EB",
  },
  c: {
    font: "SourceHanCodeJP-Normal",
    margin: shorthand([0, 1]),
    padding: shorthand([1, 1]),
    background: cmyk(10, 0, 0, 0),
  },
};

const gaps: Gap[] = [
  // footnote
  ["footnote", "footnote", 1],
  ["fallback", "footnote", 4],

  // caption
  ["figure", "caption", 0],

  // h1
  ["h1", "paragraph", 2],

  // h2
  ["h2", "fallback", 0],

  // h3
  ["h3", "fallback", 0],

  // h4
  ["h4", "fallback", 0],

  // p
  ["paragraph", "h2", 8],
  ["paragraph", "h3", 4],
  ["paragraph", "paragraph", 2],

  // code
  ["code", "caption", 2],
  ["code", "footnote", 4],

  ["fallback", "fallback", 4],
  ["fallback", "figure", 2],
];

(async () => {
  minitype(
    body,
    {
      size: "A4",
      padding,
      block: blockStyles,
      command: commandStyles,
      gap: gaps,
    },
    "article.pdf",
    {
      blockTransformers: [
        // headingTransformer,
        captionTransformer,
        footnoteTransformer(),
      ],
      commandTransformers: [
        refTransformer,
        pageRefTransformer,
        autorefTransformer,
        pageTransformer,
        fnTransformer(),
        urlTransformer,
      ],
      customExtenders: [referenceExtender("")],
    }
  );
})();
