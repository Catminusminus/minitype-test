import { atomOneLightHighlight } from "./atom-one-light.js";
import { defaultHighlight } from "./default.js";

export interface HighlightTheme {
  color: string;
  background: string;
  class: {
    classes: string[];
    color?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  }[];
}

export interface HighlightThemeRecord {
  color: string;
  background: string;
  class: Record<
    string,
    {
      color?: string;
      bold?: boolean;
      italic?: boolean;
    }
  >;
}

export const highlightThemes = {
  atomOneLight: atomOneLightHighlight,
  default: defaultHighlight,
};

export const getHighlightThemeRecord = (
  theme: HighlightTheme,
): HighlightThemeRecord => {
  const record: HighlightThemeRecord = {
    color: theme.color,
    background: theme.background,
    class: {},
  };
  for (const { classes, ...style } of theme.class) {
    for (const c of classes) {
      record.class[c] = style;
    }
  }
  return record;
};
