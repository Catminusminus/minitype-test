import { HighlightTheme } from "./highlight.js";

export const atomOneLightHighlight: HighlightTheme = {
  color: "#383a42",
  background: "#fafafa",

  class: [
    {
      classes: ["hljs-comment", "hljs-quote"],
      color: "#a0a1a7",
      italic: true,
    },
    {
      classes: ["hljs-doctag", "hljs-keyword", "hljs-formula"],
      color: "#a626a4",
    },
    {
      classes: [
        "hljs-section",
        "hljs-name",
        "hljs-selector-tag",
        "hljs-deletion",
        "hljs-subst",
      ],
      color: "#e45649",
    },
    {
      classes: ["hljs-literal"],
      color: "#0184bb",
    },
    {
      classes: [
        "hljs-string",
        "hljs-regexp",
        "hljs-addition",
        "hljs-attribute",
        "hljs-meta hljs-string",
      ],
      color: "#50a14f",
    },
    {
      classes: [
        "hljs-attr",
        "hljs-variable",
        "hljs-template-variable",
        "hljs-type",
        "hljs-selector-class",
        "hljs-selector-attr",
        "hljs-selector-pseudo",
        "hljs-number",
      ],
      color: "#986801",
    },
    {
      classes: [
        "hljs-symbol",
        "hljs-bullet",
        "hljs-link",
        "hljs-meta",
        "hljs-selector-id",
        "hljs-title",
      ],
      color: "#4078f2",
    },
    {
      classes: ["hljs-built_in", "hljs-title.class_", "hljs-class .hljs-title"],
      color: "#c18401",
    },
    { classes: ["hljs-emphasis"], italic: true },
    {
      classes: ["hljs-strong"],
      bold: true,
    },
    {
      classes: ["hljs-link"],
      underline: true,
    },
  ],
};
