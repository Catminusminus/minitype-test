import { render } from "#minitype-jsx/jsx-runtime";
import { Caption, Code, Figure, Footnote, Heading, List, Paragraph, PillarNombre, Vertical } from "./lib/block.js";
import { Inline } from "./lib/inline.js";

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


const Pillar = ({ children }: { children: string }) => pillar(children)
const H1 = ({ children }: { children: string }) => h1(children.split("\\n"));
const H2 = ({ children }: { children: string }) => h2(children);
const H3 = ({ children }: { children: string }) => h3(children);
const P = ({ children }: { children: string | string[] }) => p(Array.isArray(children) ? children : [children]);
const Author = ({ children }: { children: Inline[] }) => author(children);
const B = ({ children }: { children: string }) => b(children);
const URL = ({ children, href }: { children: string, href: string }) => url(children, href);
const Nombre = () => nombre();
const Fn = ({ children }: { children: string }) => fn(children);
const FootNote = ({ children, label }: { children: string, label: string }) => footnote(children, label);
const Li = ({ children }: { children: Inline[] }) => li(children);
const C = ({ children }: { children: string }) => c(children);
const Figure = ({ children }: { children: string }) => figure(children);
const Caption = ({ children }: { children: string }) => caption(children);


export const body = (
  <div>
    <Pillar>TypeScript でプログラマブルに動く日本語組版処理システムの提案</Pillar>
    <H1>
      TypeScript でプログラマブルに\n動く日本語組版処理システムの提案
    </H1>
    <Author>
      <B>いなにわうどん @kyoto_inaniwa</B>
      <URL href="https://zenn.dev/inaniwaudon/articles/5d040f543c4c69">
        https://zenn.dev/inaniwaudon/articles/5d040f543c4c69
      </URL>
    </Author>
    <Nombre />
    <H2>はじめに</H2>
    <P>X（旧 Twitter）のタイムラインが組版の話で盛り上がっていたため、自分も軽く参画したところ思いのほかアツくなってしまい、今なお組版への熱が失われていなかったことを再確認した</P>
    <P>
      さて、春先に TypeScript 上にてプログラマブルに作動する日本語組版処理システム（以下、仮称として minitype を用います）を構想し、数週間掛けてプロトタイプの実装を行っていました。ところが、今年度になって個人開発にリソースを割く余裕がなくなり、宙ぶらりんな状態のまま年末を迎えてしまいました。まだ開発途中ではありますが
      <Fn>software</Fn>
      、折角なので「日本語組版処理システムの夢
      <Fn>yume</Fn>
      」としてアイデアを供養するとともに、具体的なプロトタイプの実装を示したいと思います
      <Fn>system</Fn>
      。
    </P>
    <P>
      実装についてはソースコードを見ていただくこととして、本記事では特に「
      <B>ユーザがどのような記述をするとどのような出力が得られるのか</B>
      」という点に焦点を絞って紹介を進めていきます。
    </P>
    <FootNote label="software">ソフトウェアは出す時期も大事で、完璧を目指すと一生日の目を見ることはない</FootNote>
    <FootNote label="yume">ヨドバシの福袋？</FootNote>
    <FootNote label="system">概念実証のような段階であり、実用は目的としていません</FootNote>
    <H2>概念</H2>
    <P>minitype は TypeScript を用いて記述され、Node.js 上で作動します。プロトタイプの実装を以下の GitHub レポジトリに公開しています。開発途中であるため機能は限定的です（バグもあります）。</P>
    <Li>
      inaniwaudon/minitype-test
      <URL href="https://github.com/inaniwaudon/minitype-test">
        https://github.com/inaniwaudon/minitype-test
      </URL>
    </Li>
    <P>
      詳細を話す前に、まずはシステムの動作例をご覧ください。以下のソースコードは、本記事と同様の文書を記述した ts ファイルになります。minitype のパッケージを
      <C>npm i</C>
      した後、
      <C>npx article.ts</C>
      を実行することにより、図 1 に示す PDF 文書を出力することができます。
    </P>
    <P>（ソースコードは省略）</P>
    <Figure>thumbnail.png</Figure>
    <Caption>minitype を用いて作成した組版例</Caption>
    <P>
      実装としては、OpenType の読み込みに
      <URL href="https://github.com/opentypejs">opentype.js</URL>
      を、PDF の描画に
      <URL href="https://pdfkit.org/">pdfkit</URL>
      を使用しています。現状の実装ではテキストをアウトライン化した PDF を生成しているため、フォントの埋め込みは今後の課題になります。加えて、シンタックスハイライトに lowlight を、フォントのキャッシュ周りには sqlite3 を使用しています。
    </P>
    <H3>マークアップ</H3>
  </div>
);

export const body2 = [
  pillar("TypeScript でプログラマブルに動く日本語組版処理システムの提案"),
  h1(["TypeScript でプログラマブルに", "動く日本語組版処理システムの提案"]),
  author([
    b("いなにわうどん @kyoto_inaniwa"),
    url(
      "https://zenn.dev/inaniwaudon/articles/5d040f543c4c69",
      "https://zenn.dev/inaniwaudon/articles/5d040f543c4c69"
    ),
  ]),
  nombre(),

  h2("はじめに"),
  p([
    "X（旧 X（旧 Twitter）のタイムラインが組版の話で盛り上がっていたため、自分も軽く参画したところ思いのほかアツくなってしまい、今なお組版への熱が失われていなかったことを再確認した 12 月初頭です。",
  ]),
  p([
    "さて、春先に TypeScript 上にてプログラマブルに作動する日本語組版処理システム（以下、仮称として minitype を用います）を構想し、数週間掛けてプロトタイプの実装を行っていました。ところが、今年度になって個人開発にリソースを割く余裕がなくなり、宙ぶらりんな状態のまま年末を迎えてしまいました。まだ開発途中ではありますが",
    fn("software"),
    "、折角なので「日本語組版処理システムの夢",
    fn("yume"),
    "」としてアイデアを供養するとともに、具体的なプロトタイプの実装を示したいと思います",
    fn("system"),
    "。",
  ]),
  p([
    "実装についてはソースコードを見ていただくこととして、本記事では特に「",
    b("ユーザがどのような記述をするとどのような出力が得られるのか"),
    "」という点に焦点を絞って紹介を進めていきます。",
  ]),
  footnote(
    "ソフトウェアは出す時期も大事で、完璧を目指すと一生日の目を見ることはない",
    "software"
  ),
  footnote("ヨドバシの福袋？", "yume"),
  footnote("概念実証のような段階であり、実用は目的としていません", "system"),

  h2("概要"),
  p([
    "minitype は TypeScript を用いて記述され、Node.js 上で作動します。プロトタイプの実装を以下の GitHub レポジトリに公開しています。開発途中であるため機能は限定的です（バグもあります）。",
  ]),
  li([
    "inaniwaudon/minitype-test",
    url(
      "https://github.com/inaniwaudon/minitype-test",
      "https://github.com/inaniwaudon/minitype-test"
    ),
  ]),
  p([
    "詳細を話す前に、まずはシステムの動作例をご覧ください。以下のソースコードは、本記事と同様の文書を記述した ts ファイルになります。minitype のパッケージを",
    c("npm i"),
    "した後、",
    c("npx article.ts"),
    "を実行することにより、図 1 に示す PDF 文書を出力することができます。",
  ]),
  p(["（ソースコードは省略）"]),
  figure("thumbnail.png"),
  caption("minitype を用いて作成した組版例"),
  p([
    "実装としては、OpenType の読み込みに",
    url("opentype.js", "https://github.com/opentypejs"),
    "を、PDF の描画に",
    url("pdfkit", "https://pdfkit.org/"),
    "を使用しています。現状の実装ではテキストをアウトライン化した PDF を生成しているため、フォントの埋め込みは今後の課題になります。加えて、シンタックスハイライトに lowlight を、フォントのキャッシュ周りには sqlite3 を使用しています。",
  ]),

  h3("マークアップ"),
];
