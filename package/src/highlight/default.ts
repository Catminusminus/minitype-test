import { HighlightTheme } from "./highlight.js";

export const defaultHighlight: HighlightTheme = {
  background: "#F3F3F3",
  color: "#444",
  class: [
    {
      classes: ["hljs-comment"],
      color: "#697070",
    },
    {
      classes: ["hljs-tag", "hljs-punctuation"],
      color: "#444a",
    },
    {
      classes: ["hljs-tag", "hljs-name", "hljs-tag", "hljs-attr"],
      color: "#444",
    },
    {
      classes: [
        "hljs-keyword",
        "hljs-attribute",
        "hljs-selector-tag",
        "hljs-meta .hljs-keyword",
        "hljs-doctag",
        "hljs-name",
      ],
      bold: true,
    },
    {
      classes: [
        "hljs-type",
        "hljs-string",
        "hljs-number",
        "hljs-selector-id",
        "hljs-selector-class",
        "hljs-quote",
        "hljs-template-tag",
        "hljs-deletion",
      ],
      color: "#880000",
    },
    {
      classes: ["hljs-title", "hljs-section"],
      color: "#880000",
      bold: true,
    },
    {
      classes: [
        "hljs-regexp",
        "hljs-symbol",
        "hljs-variable",
        "hljs-template-variable",
        "hljs-link",
        "hljs-selector-attr",
        "hljs-operator",
        "hljs-selector-pseudo",
      ],
      color: "#ab5656",
    },
    {
      classes: ["hljs-literal"],
      color: "#695",
    },
    {
      classes: ["hljs-built_in", "hljs-bullet", "hljs-code", "hljs-addition"],
      color: "#397300",
    },
    {
      classes: ["hljs-meta"],
      color: "#1f7199",
    },
    {
      classes: ["hljs-meta", "hljs-string"],
      color: "#38a",
    },
    {
      classes: ["hljs-emphasis"],
      italic: true,
    },
    {
      classes: ["hljs-strong"],
      bold: true,
    },
  ],
};
