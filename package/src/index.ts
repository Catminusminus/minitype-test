export { MiniTypeOptions, minitype } from "./main.js";

export {
  Block,
  Box,
  Caption,
  Code,
  CustomBlock,
  Figure,
  Footnote,
  Heading,
  HeadingLevel,
  List,
  MathBlock,
  NewPage,
  Paragraph,
  PillarNombre,
  Table,
  Vertical,
} from "./lib/block.js";

export { Command, Inline, Link } from "./lib/inline.js";

export {
  BlockLabel,
  BlockLabelType,
  HeadingIndex,
  LabelMap,
} from "./lib/label.js";

export {
  captionTransformer,
  footnoteTransformer,
  headingTransformer,
} from "./plugin/block-transformer.js";

export {
  autorefTransformer,
  fnTransformer,
  pageRefTransformer,
  pageTransformer,
  refTransformer,
  urlTransformer,
} from "./plugin/command-transformer.js";

export { referenceExtender } from "./plugin/custom-extender.js";

export {
  BlockOperation,
  BlockTransformer,
  CommandTransformerEnv,
  CustomExtender,
  TransformerEnv,
} from "./plugin/index.js";

export {
  Align,
  CMYK,
  Color,
  Em,
  Margin,
  Padding,
  PageSize,
  PaperSize,
  Point,
  Ratio,
  RGB,
  Shorthand,
  Size,
  TextAlign,
  cmyk,
  em,
  ratio,
  rgb,
  shorthand,
} from "./style/figure.js";

export {
  AllBorder,
  BlockStyleList,
  Border,
  BoxStyle,
  CharStyle,
  CommandStyle,
  CommandStyleRecord,
  Decoration,
  DocumentStyle,
  FigureStyle,
  Gap,
  InlineStyle,
  ListStyle,
  MathStyle,
  TextStyle,
} from "./style/style.js";

export {
  TextSpace,
  TEXT_SPACE_FULL,
  TEXT_SPACE_HALF,
  TEXT_SPACE_HEADTAIL_HALF,
} from "./typesetting/typesetter.js";
