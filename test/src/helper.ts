import { Paragraph } from "minitype";
import { Code } from "minitype";
import { Inline } from "minitype";
import { Figure } from "minitype";
import { Caption } from "minitype";
import { List } from "minitype";
import { Footnote } from "minitype";
import { Vertical } from "minitype";
import { Heading } from "minitype";
import { PillarNombre } from "minitype";

export const pillar = (text: string): PillarNombre => {
  return {
    type: "pillar",
    lines: [[text]],
  };
};

export const nombre = (): PillarNombre => {
  return {
    type: "nombre",
    lines: [[{ name: "page", body: [] }]],
  };
};

export const h1 = (lines: string[]): Heading => {
  return {
    type: "heading",
    level: 1,
    lines: lines.map((text) => [text]),
  };
};

export const h2 = (text: string): Heading => {
  return {
    type: "heading",
    level: 2,
    lines: [[text]],
  };
};

export const h3 = (text: string): Heading => {
  return {
    type: "heading",
    level: 3,
    lines: [[text]],
  };
};

export const h4 = (text: string): Heading => {
  return {
    type: "heading",
    level: 4,
    lines: [[text]],
  };
};

export const p = (inlines: Inline[]): Paragraph => {
  return {
    type: "paragraph",
    lines: [inlines],
  };
};

export const author = (lines: Inline[]): Paragraph => {
  return {
    type: "paragraph",
    lines: lines.map((line) => [line]),
    style: {
      align: "right",
    },
  };
};

export const footnote = (text: string, label: string): Footnote => {
  return {
    type: "footnote",
    label,
    lines: [[text]],
  };
};

export const code = (lines: string): Code => {
  return {
    type: "code",
    lang: "typescript",
    lines: lines.split("\n").map((line) => line),
  };
};

export const figure = (src: string): Figure => {
  return {
    type: "figure",
    src,
  };
};

export const caption = (text: string): Caption => {
  return {
    type: "caption",
    lines: [[text]],
  };
};

export const li = (lines: Inline[]): List => {
  return {
    type: "list",
    level: 1,
    lines: lines.map((text) => [text]),
  };
};

export const vpsace = (space: number): Vertical => {
  return { type: "vertical", space };
};

export const fn = (ref: string): Inline => {
  return { name: "fn", footnoteRef: ref, body: [ref] };
};

export const b = (text: string): Inline => {
  return { name: "b", body: [text] };
};

export const c = (text: string): Inline => {
  return { name: "c", body: [text] };
};

export const url = (text: string, href: string): Inline => {
  return { name: "url", body: [text], attrs: [href] };
};
