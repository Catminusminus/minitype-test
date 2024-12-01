import {
  DEFAULT_FIGURE_ALIGN,
  DEFAULT_FIGURE_RATIO,
  DEFAULT_TABLE_ALIGN,
} from "@/style/default-style.js";
import {
  Color,
  Margin,
  Padding,
  Size,
  getAlignRatio,
  ratio,
} from "@/style/figure.js";
import {
  Border,
  BoxStyle,
  DocumentStyle,
  drawsDecoration,
  getGap,
  getGapBlockType,
  getTableTextStyle,
  getTextStyle,
  mixFigureStyle,
  mixTableStyle,
} from "@/style/style.js";
import {
  BlockInfo,
  BoxInfo,
  FigureWithId,
  FlowTextInfo,
  TableInfo,
  TextInfo,
} from "./block.js";
import { Drawable, DrawableRect } from "./draw.js";
import { LabelMap } from "./label.js";
import { clone, getImageSize, sum } from "./utils.js";
import { CharInfo, CharRectInfo } from "./inline.js";

export class VerticalProcessor {
  private queue: BlockInfo[];
  private leftLabelToFootnote: Record<string, TextInfo>;
  private drawablesByPage: {
    verticalRects: DrawableRect[];
    others: Drawable[];
  }[] = [{ verticalRects: [], others: [] }];

  private horizontalSpaces: {
    margin: Margin;
    padding: Padding;
  }[] = [];

  // 次行の上端
  private y = 0;
  // 前行の下端と次行の上端の差分
  private diffLineY = 0;

  // キーは ID
  private rectStartInfo: Record<
    string,
    { y: number; index: number; firstPage: boolean; style: BoxStyle }
  > = {};

  // 脚注
  private footnote: {
    // 現在のページで処理すべき脚注
    current: {
      info: TextInfo[];
      height: number;
    };
    // 次のページで処理すべき脚注
    next: {
      info: TextInfo[];
      height: number;
    };
  } = {
    current: { info: [], height: 0 },
    next: { info: [], height: 0 },
  };

  constructor(
    blockInfos: BlockInfo[],
    labelToFootnote: Record<string, TextInfo>,
    private style: DocumentStyle,
    private baseSize: Size,
    private labelMap: LabelMap
  ) {
    this.queue = [...blockInfos];
    this.leftLabelToFootnote = { ...labelToFootnote };
  }

  private get lastPage() {
    return this.drawablesByPage.at(-1)!;
  }

  // 脚注を除いた残りの高さ
  private get leftHeight() {
    const gap =
      this.footnote.current.info.length > 0
        ? getGap("fallback", "footnote", this.style.gap)
        : 0;
    return this.baseSize.height - this.footnote.current.height - gap;
  }

  private get drawableIndex() {
    return this.drawablesByPage.reduce(
      (prev, { verticalRects, others }) =>
        prev + verticalRects.length + others.length,
      0
    );
  }

  process(): Drawable[][] {
    let previous: TextInfo | FigureWithId | TableInfo | BoxInfo | null = null;

    while (this.queue.length > 0) {
      const current = this.queue.shift()!;

      const isText = current.type === "text";
      const isFlowText = current.type === "flow-text";
      const isFigure = current.type === "figure";
      const isTable = current.type === "table";
      const startsBox = current.type === "box" && current.position === "start";
      const endsBox = current.type === "box" && current.position === "end";

      // 段間計算
      if (previous && (isText || isFigure || isTable || startsBox)) {
        const previousGap = getGapBlockType(previous);
        const currentGap = getGapBlockType(current);
        const gap = getGap(previousGap, currentGap, this.style.gap);
        this.y += gap;
      }

      // 柱・ノンブルの位置を調整
      if (isFlowText) {
        this.adjustFlowTextPosition(current);
      }

      // 矩形の開始位置を記録
      if (isText || isFlowText || startsBox) {
        const style = this.getBoxStyle(current);
        this.y += style.margin?.top ?? 0;
        this.horizontalSpaces.push({
          margin: style.margin ?? {},
          padding: style.padding ?? {},
        });

        if (drawsDecoration(style)) {
          this.rectStartInfo[current.id] = {
            y: this.y,
            index: this.drawableIndex,
            firstPage: true,
            style,
          };
        }
        this.y += style.padding?.top ?? 0;
      }

      switch (current.type) {
        case "text":
          this.pushText(current, true);
          break;
        case "flow-text":
          this.pushFlowText(current);
          break;
        case "figure":
          this.pushFigure(current);
          break;
        case "table":
          this.pushTable(current);
          break;
        case "newpage":
          this.recordPageIndex(current);
          this.newPage();
          break;
        case "vertical":
          this.recordPageIndex(current);
          this.y += current.space;
          this.diffLineY = 0;

          if (this.y > this.leftHeight) {
            this.newPage();
          }
          break;
      }

      // 矩形を追加
      if (isText || isFlowText || endsBox) {
        const style = this.getBoxStyle(current);
        this.y += (style.padding?.bottom ?? 0) - this.diffLineY;

        if (this.rectStartInfo[current.id]) {
          this.pushRect(current.id, true);
          delete this.rectStartInfo[current.id];
        }

        this.y += (style.margin?.bottom ?? 0) + this.diffLineY;
        this.horizontalSpaces.pop();
      }

      previous = isText || isFigure || isTable || endsBox ? current : null;
    }

    // オブジェクトのソート
    return this.drawablesByPage.map((drawables) => {
      // y 座標の小さい順にソート。y 座標が等しい場合は高さが大きい順にソート
      const sortedRects = [...drawables.verticalRects]
        .sort((a, b) => (a.y === b.y ? b.height - a.height : a.y - b.y))
        .map<Drawable>((item, index) => ({ ...item, zIndex: [0, index] }));
      return [...drawables.others, ...sortedRects];
    });
  }

  private getX(rect: boolean) {
    let sum = 0;
    for (let i = 0; i < this.horizontalSpaces.length; i++) {
      const space = this.horizontalSpaces[i];
      sum += space.margin?.left ?? 0;
      if (i < this.horizontalSpaces.length - 1 || !rect) {
        sum += space.padding?.left ?? 0;
      }
    }
    return sum;
  }

  private getWidth(rect: boolean) {
    let width = this.baseSize.width;
    for (let i = 0; i < this.horizontalSpaces.length; i++) {
      const space = this.horizontalSpaces[i];
      width -= (space.margin?.left ?? 0) + (space.margin?.right ?? 0);
      if (i < this.horizontalSpaces.length - 1 || !rect) {
        width -= (space.padding?.left ?? 0) + (space.padding?.right ?? 0);
      }
    }
    return width;
  }

  private getBoxStyle(block: TextInfo | FlowTextInfo | BoxInfo) {
    return block.type === "box"
      ? this.style.block.box?.[block.name] ?? {}
      : getTextStyle(block.subtype, this.style.block);
  }

  private pushRect(id: string, lastPage: boolean) {
    const info = this.rectStartInfo[id];
    if (this.drawableIndex > info.index) {
      // ページを跨ぐ場合は枠線の上下を削除
      const style = clone(info.style);
      if (!info.firstPage) {
        delete style.border?.top;
      }
      if (!lastPage) {
        delete style.border?.bottom;
      }

      this.lastPage.verticalRects.push({
        type: "rect",
        x: this.getX(true),
        y: info.y,
        width: this.getWidth(true),
        height: this.y - info.y,
        decoration: style,
        zIndex: [0, 0],
      });
      return true;
    }
    return false;
  }

  // テキスト
  private pushText(text: TextInfo, breakable: boolean) {
    const style = getTextStyle(text.subtype, this.style.block);

    // 脚注はこれまでのマージン・パディングの影響を受けない
    const x = text.subtype !== "footnote" ? this.getX(false) : 0;

    // 分割禁止でページを跨ぐ場合は改ページ
    const totalHeight = style.lineHeight * text.lines.length;
    if (
      breakable &&
      !text.splitable &&
      this.y +
        (style.margin?.top ?? 0) +
        (style.padding?.top ?? 0) +
        totalHeight >
        this.leftHeight
    ) {
      this.newPage();
    }

    for (let i = 0; i < text.lines.length; i++) {
      const line = text.lines[i];

      // 改ページ
      const maxHeight =
        line.length > 0 ? Math.max(...line.map((char) => char.size)) : 0;
      if (breakable && this.y + maxHeight > this.leftHeight) {
        this.newPage();
      }
      // 最初に出現した行のページ番号とディスティネーションを記録
      if (i === 0) {
        this.recordPageIndex(text);

        this.lastPage.others.push({
          type: "destination",
          y: this.y,
          id: text.id,
          zIndex: [0, 0],
        });
      }

      this.addLineAndRect(line, text.lineRects[i], x);
      this.y += style.lineHeight;
      this.diffLineY = style.lineHeight - maxHeight;
      this.addFootnotes(text.lineToFootnotes[i]);
    }
  }

  // 図版
  private pushFigure(figure: FigureWithId) {
    const style = mixFigureStyle(
      figure.style ?? {},
      this.style.block.figure ?? {}
    );
    const align = style.align ?? DEFAULT_FIGURE_ALIGN;

    // サイズの決定
    const size = getImageSize(figure.src);
    const width = style.width ?? ratio(DEFAULT_FIGURE_RATIO);
    const imageWidth =
      typeof width === "number" ? width : this.baseSize.width * width.value;
    const imageHeight = imageWidth * (size.height / size.width);

    // 改ページ
    if (this.y + imageHeight > this.leftHeight) {
      this.newPage();
    }
    this.recordPageIndex(figure);

    const x =
      this.getX(false) +
      (this.getWidth(false) - imageWidth) * getAlignRatio(align);

    this.lastPage.others.push({
      type: "destination",
      y: this.y,
      id: figure.id,
      zIndex: [0, 0],
    });

    this.lastPage.others.push({
      type: "figure",
      src: figure.src,
      x,
      y: this.y,
      width: imageWidth,
      height: imageHeight,
      zIndex: [2, 0],
    });

    this.y += imageHeight;
    this.diffLineY = 0;
  }

  // フローテキスト
  private adjustFlowTextPosition(flowText: FlowTextInfo) {
    // 柱
    if (flowText.subtype === "pillar") {
      const style = getTextStyle(flowText.subtype, this.style.block);

      // テキストの高さ + パディングの分だけ上にずらす
      this.y = -(style.padding?.top ?? 0) - (style.padding?.bottom ?? 0);
      if (flowText.lines.length > 0) {
        this.y -=
          (flowText.lines.length - 1) * style.lineHeight +
          Math.max(...flowText.lines.at(-1)!.map((char) => char.size));
      }
    }
    // ノンブル
    if (flowText.subtype === "nombre") {
      this.y = this.baseSize.height;
    }
  }

  // フローテキスト
  private pushFlowText(flowText: FlowTextInfo) {
    const style = getTextStyle(flowText.subtype, this.style.block);

    this.lastPage.others.push({
      type: "destination",
      y: this.y,
      id: flowText.id,
      zIndex: [0, 0],
    });

    for (let i = 0; i < flowText.lines.length; i++) {
      const line = flowText.lines[i];
      const maxHeight =
        line.length > 0 ? Math.max(...line.map((char) => char.size)) : 0;

      this.lastPage.others.push({
        type: "line",
        chars: line,
        // フローテキストは本文と別に処理されるため、マージンとパディングの影響を受けない
        x: this.getX(false),
        y: this.y,
        zIndex: [2, 0],
      });

      this.y += style.lineHeight;
      this.diffLineY = style.lineHeight - maxHeight;
    }
  }

  /**
   * 表を処理する
   */
  private pushTable(table: TableInfo) {
    // スタイルの算出
    const style = mixTableStyle(
      table.style ?? {},
      this.style.block.table ?? {}
    );
    const align = style.align ?? DEFAULT_TABLE_ALIGN;

    // 行ごとのスタイル
    const lineStyles = table.rows.map((_, yi) => {
      const textStyle = getTableTextStyle(
        style,
        this.style.block.paragraph,
        yi
      );
      return {
        lineHeight: textStyle.lineHeight,
        padding: style?.padding?.(yi),
        background: style?.background?.(yi),
      };
    });

    // 行の高さを計測
    const rowHeights = table.rows.map((row, yi) => {
      const cellHeights: number[] = [0];
      for (const cell of row) {
        // セルの高さ：行送り × (行数 - 1) + 最大文字サイズ + 上下パディング
        if (cell.lines.length > 0) {
          const cellHeight =
            (cell.lines.length - 1) * lineStyles[yi].lineHeight +
            Math.max(...cell.lines.at(-1)!.map((char) => char.size)) +
            (lineStyles[yi].padding?.top ?? 0) +
            (lineStyles[yi].padding?.bottom ?? 0);
          cellHeights.push(cellHeight);
        }
      }
      return Math.max(...cellHeights);
    });

    // 表全体のサイズを計測
    const tableWidth = table.rows[0].reduce((prev, row) => prev + row.width, 0);
    const tableHeight = sum(rowHeights);
    const left =
      this.getX(false) +
      (this.getWidth(false) - tableWidth) * getAlignRatio(align);

    // 改ページ
    if (this.y + tableHeight > this.leftHeight) {
      this.newPage();
    }
    this.recordPageIndex(table);

    // 描画
    const initialY = this.y;

    // 罫線の挿入
    const pushBorder = (
      border: Border | null | undefined,
      options: { type: "horizontal" } | { type: "vertical"; x: number }
    ) => {
      if (!border) {
        return;
      }

      const { x, y, width, height } =
        options.type === "vertical"
          ? {
              x: left + options.x,
              y: initialY,
              width: border.width,
              height: tableHeight,
            }
          : { x: left, y: this.y, width: tableWidth, height: border.width };

      this.lastPage.others.push({
        type: "rect",
        x,
        y,
        width,
        height,
        decoration: {
          background: border.color,
        },
        zIndex: [2, 0],
      });
    };

    for (let yi = 0; yi < table.rows.length; yi++) {
      this.y = initialY + sum(rowHeights.slice(0, yi));
      pushBorder(table.horizontalBorders[yi], { type: "horizontal" });

      // 矩形を追加
      if (drawsDecoration(lineStyles[yi])) {
        this.lastPage.others.push({
          type: "rect",
          x: left,
          y: this.y,
          width: tableWidth,
          height: rowHeights[yi],
          decoration: {
            background: lineStyles[yi].background,
          },
          zIndex: [1, 0],
        });
      }

      const padding = lineStyles[yi].padding;
      this.y += padding?.top ?? 0;
      const initialTextY = this.y;

      for (const cell of table.rows[yi]) {
        this.y = initialTextY;
        for (let linei = 0; linei < cell.lines.length; linei++) {
          this.addLineAndRect(
            cell.lines[linei],
            cell.lineRects[linei],
            left + cell.x + (padding?.left ?? 0)
          );

          this.y += lineStyles[yi].lineHeight;
        }
      }
    }

    this.y = initialY + tableHeight;
    this.diffLineY = 0;
    pushBorder(table.horizontalBorders[table.rows.length], {
      type: "horizontal",
    });

    // 縦の罫線を挿入
    for (let xi = 0; xi <= table.rows[0].length; xi++) {
      pushBorder(table.verticalBorders[xi], {
        type: "vertical",
        x: table.rows[0][xi]?.x ?? tableWidth,
      });
    }

    const footnotes = table.rows.flatMap((row) =>
      row.flatMap((cell) => cell.lineToFootnotes.flat())
    );
    this.addFootnotes(footnotes);
  }

  /**
   * 改ページを処理する
   */
  private newPage() {
    // 矩形の追加
    for (const [id, info] of Object.entries(this.rectStartInfo)) {
      const hasPushed = this.pushRect(id, false);
      if (hasPushed) {
        info.firstPage = false;
      }
    }

    // 脚注の追加
    // TODO: 最後のページだと出ない現象を修正する
    this.y = this.baseSize.height - this.footnote.current.height;

    for (const footnote of this.footnote.current.info) {
      this.pushText(footnote, false);
      const gap = getGap("footnote", "footnote", this.style.gap);
      this.y += gap;
    }
    this.footnote.current = this.footnote.next;
    this.footnote.next = { info: [], height: 0 };

    this.y = 0;
    this.diffLineY = 0;

    for (const info of Object.values(this.rectStartInfo)) {
      info.y = this.y;
      if (info.firstPage) {
        this.y += info.style.padding?.top ?? 0;
      }
    }

    this.drawablesByPage.push({
      verticalRects: [],
      others: [],
    });
  }

  /**
   * 行と、行ごとの矩形を追加する
   */
  private addLineAndRect(
    line: CharInfo[],
    lineRects: CharRectInfo[],
    x: number
  ) {
    // 行を追加
    this.lastPage.others.push({
      type: "line",
      chars: line,
      x,
      y: this.y,
      zIndex: [2, 0],
    });

    // 行ごとの矩形を追加
    // y 座標の小さい順にソート。y 座標が等しい場合は高さが大きい順にソート
    const sortedLineRects = [...lineRects].sort((a, b) =>
      a.x === b.x ? b.width - a.width : a.x - b.x
    );
    for (let i = 0; i < sortedLineRects.length; i++) {
      const rect = sortedLineRects[i];
      // 矩形
      if (rect.decoration) {
        this.lastPage.others.push({
          type: "rect",
          x: x + rect.x,
          y: this.y + rect.y,
          width: rect.width,
          height: rect.height,
          decoration: rect.decoration,
          zIndex: [1, i],
        });
      }

      // リンク
      if (rect.link) {
        this.lastPage.others.push({
          type: "link",
          x: x + rect.x,
          y: this.y + rect.y,
          width: rect.width,
          height: rect.height,
          link: rect.link,
          zIndex: [3, i],
        });
      }
    }
  }

  /**
   * 参照先の脚注を追加する
   */
  private addFootnotes(footnotes: string[]) {
    for (const footnoteId of footnotes) {
      if (footnoteId in this.leftLabelToFootnote) {
        const footnote = this.leftLabelToFootnote[footnoteId];
        const footnoteStyle = getTextStyle(footnote.subtype, this.style.block);

        const gap = getGap("footnote", "footnote", this.style.gap);
        const height =
          footnoteStyle.lineHeight * footnote.lines.length +
          (footnoteStyle.margin?.top ?? 0) +
          (footnoteStyle.margin?.bottom ?? 0) +
          (footnoteStyle.padding?.top ?? 0) +
          (footnoteStyle.padding?.bottom ?? 0);

        // 高さを越える場合は次ページに追加
        if (this.y + height > this.leftHeight) {
          this.footnote.next.info.push(footnote);
          this.footnote.next.height += height;
          if (this.footnote.next.info.length > 0) {
            this.footnote.next.height += gap;
          }
        }
        // そうでない場合は現在のページに追加
        else {
          this.footnote.current.info.push(footnote);
          this.footnote.current.height += height;
          if (this.footnote.current.info.length > 0) {
            this.footnote.current.height += gap;
          }
        }

        delete this.leftLabelToFootnote[footnoteId];
      }
    }
  }

  /**
   * ページ番号を記録する
   */
  private recordPageIndex(blockInfo: BlockInfo) {
    this.labelMap.block.id[blockInfo.id!].pageIndex =
      this.drawablesByPage.length;
  }
}
