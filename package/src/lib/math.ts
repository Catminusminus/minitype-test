import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { SVG } from "mathjax-full/js/output/svg.js";

const MATHJAX_CSS = [
  "svg a{fill:blue;stroke:blue}",
  '[data-mml-node="merror"]>g{fill:red;stroke:red}',
  '[data-mml-node="merror"]>rect[data-background]{fill:yellow;stroke:none}',
  "[data-frame],[data-line]{stroke-width:70px;fill:none}",
  ".mjx-dashed{stroke-dasharray:140}",
  ".mjx-dotted{stroke-linecap:round;stroke-dasharray:0,140}",
  "use[data-c]{stroke-width:3px}",
].join("");

export const texToSvg = (str: string, size: number) => {
  // c.f. https://github.com/mathjax/MathJax-demos-node/blob/master/direct/tex2svg
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);

  const isDisplay = true;
  const em = 16;
  const ex = em / 2;
  const width = 80 * em;

  const tex = new TeX({ packages: AllPackages.sort() });
  const svg = new SVG({ fontCache: "none" });
  const html = mathjax.document("", { InputJax: tex, OutputJax: svg });

  const node = html.convert(str, {
    display: isDisplay,
    em: em,
    ex: ex,
    containerWidth: width,
  });

  // 縮尺を変換
  const html2 = adaptor.innerHTML(node);
  const originalSvg = html2.replace(
    /<defs>/,
    `<defs><style>${MATHJAX_CSS}</style>`,
  );

  const options = {
    ignoreAttributes: false,
    ignoreDeclaration: true,
  };
  const data = new XMLParser(options).parse(originalSvg);
  const originalWidth = parseFloat(data.svg["@_width"].replace("ex", ""));
  const originalHeight = parseFloat(data.svg["@_height"].replace("ex", ""));
  const ratio = 0.5 * size;
  data.svg["@_width"] = `${originalWidth * ratio}mm`;
  data.svg["@_height"] = `${originalHeight * ratio}mm`;

  return {
    svg: new XMLBuilder(options).build(data),
    width: originalWidth * ratio,
  };
};
