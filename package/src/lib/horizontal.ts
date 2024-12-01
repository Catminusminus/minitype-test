import {
  DEFAULT_TABLE_FIRST_INDENT,
  DEFAULT_TABLE_INDENT,
  DEFAULT_TEXT_ALIGN,
  DEFAULT_TEXT_SPACE,
  getDefaultFirstIndent,
  getDefaultIndent,
  getDefaultPre,
} from "@/style/default-style.js";
import { TextAlign, getUnit } from "@/style/figure.js";
import {
  Decoration,
  DocumentStyle,
  Indent,
  TextStyle,
  drawsDecoration,
  getTableTextStyle,
  getTextStyle,
  mixTableStyle,
  mixTextStyle,
  textToInlineStyleWithoutBoxStyle,
} from "@/style/style.js";
import {
  removeJaEnSpaces,
  trimEndSpaces,
  trimStartSpaces,
} from "@/typesetting/char-class.js";
import {
  TextSpace,
  calculateCharPositions,
  getSplitIndex,
} from "@/typesetting/typesetter.js";
import {
  BaseBlock,
  BlockInfo,
  FlowText,
  FlowTextInfo,
  TableCellInfo,
  TableInfo,
  TableWithId,
  Text,
  TextInfo,
} from "./block.js";
import {
  CharInfo,
  CharRectInfo,
  InlineWithId,
  inlinesToTempCharInfo,
  unifyInlineStyle,
} from "./inline.js";
import { LabelMap } from "./label.js";
import { clone } from "./utils.js";

export class HorizontalProcessor {
  private x = 0;
  private width: number;

  constructor(
    private style: DocumentStyle,
    baseWidth: number,
    private labelMap: LabelMap
  ) {
    this.width = baseWidth;
  }

  process(baseBlocks: BaseBlock[]) {
    const blockInfoList: BlockInfo[] = [];
    const labelToFootnote: Record<string, TextInfo> = {};

    for (const block of baseBlocks) {
      const pageIndex = this.labelMap.block.id[block.id]
        ? this.labelMap.block.id[block.id].pageIndex ?? 0
        : 0;

      // マージン・パディングの追加
      const horizontalSpaces = this.getHorizontalSpaces(block);
      if (horizontalSpaces) {
        this.x += horizontalSpaces.left;
        this.width -= horizontalSpaces.left + horizontalSpaces.right;
      }

      switch (block.type) {
        // テキスト
        case "text":
          const textInfo = this.calculateText(block, pageIndex);
          if (block.subtype === "footnote" && textInfo.type === "text") {
            // footnote には必ず label が存在する
            labelToFootnote[block.label] = textInfo;
          } else {
            blockInfoList.push(textInfo);
          }
          break;

        // フローテキスト
        case "flow-text":
          blockInfoList.push(this.calculateText(block, pageIndex));
          break;

        // 表
        case "table":
          blockInfoList.push(this.calculateTable(block, pageIndex));
          break;

        // ボックス
        case "box":
          blockInfoList.push({
            type: "box",
            name: block.name,
            position: "start",
            id: block.id,
            label: block.label,
          });

          // 子ブロックを再帰的に処理
          const childResult = this.process(block.blocks);
          blockInfoList.push(...childResult.blockInfoList);
          Object.assign(labelToFootnote, childResult.labelToFootnote);

          blockInfoList.push({
            type: "box",
            name: block.name,
            position: "end",
            id: block.id,
            label: block.label,
          });
          break;

        // その他
        case "newpage":
        case "vertical":
        case "figure":
          blockInfoList.push(block);
          break;
      }

      // マージン・パディングの削除
      if (horizontalSpaces) {
        this.x -= horizontalSpaces.left;
        this.width += horizontalSpaces.left + horizontalSpaces.right;
      }
    }
    return { blockInfoList, labelToFootnote };
  }

  /**
   * 左右に対して、マージンとパディングの合計を取得する
   */
  private getHorizontalSpaces(block: BaseBlock) {
    if (
      block.type !== "text" &&
      block.type !== "flow-text" &&
      block.type !== "box"
    ) {
      return null;
    }
    const style =
      block.type === "box"
        ? this.style.block.box?.[block.name] ?? {}
        : getTextStyle(block.subtype, this.style.block);
    return {
      left: (style.margin?.left ?? 0) + (style.padding?.left ?? 0),
      right: (style.margin?.right ?? 0) + (style.padding?.right ?? 0),
    };
  }

  /**
   * テキストを計算する
   */
  private calculateText(
    text: Text | FlowText,
    pageIndex: number
  ): TextInfo | FlowTextInfo {
    // スタイルの算出
    const baseTextStyle = getTextStyle(text.subtype, this.style.block);
    const textStyle = mixTextStyle(text.style ?? {}, baseTextStyle);

    const indent = {
      normal: getUnit(
        textStyle.indent ?? getDefaultIndent(text.subtype),
        textStyle.size
      ),
      first: getUnit(
        textStyle.firstIndent ?? getDefaultFirstIndent(text.subtype),
        textStyle.size
      ),
    };
    const pre = textStyle.pre ?? getDefaultPre(text.subtype);
    const space = textStyle.space ?? DEFAULT_TEXT_SPACE();

    const align = (() => {
      if (!textStyle.align) {
        return DEFAULT_TEXT_ALIGN;
      }
      if (typeof textStyle.align === "string") {
        return textStyle.align;
      }
      return textStyle.align(pageIndex);
    })();

    const { lineInfos, lineRectInfos, lineToFootnotes } =
      this.calculateLineInfos(
        text.lines as InlineWithId[][],
        this.width,
        textStyle,
        {
          pre,
          align,
          indent,
          space,
        }
      );

    if (text.type === "flow-text") {
      return {
        type: "flow-text",
        subtype: text.subtype,
        lines: lineInfos,
        lineRects: lineRectInfos,
        label: text.label,
        id: text.id,
      };
    }

    return {
      type: "text",
      subtype: text.subtype,
      lines: lineInfos,
      lineRects: lineRectInfos,
      lineToFootnotes,
      splitable: text.splitable,
      label: text.label,
      id: text.id,
    };
  }

  /**
   * 表を計算する
   */
  private calculateTable(table: TableWithId, pageIndex: number): TableInfo {
    // スタイルの算出
    const style = mixTableStyle(
      table.style ?? {},
      this.style.block.table ?? {}
    );

    // 行ごとのスタイル
    const lineStyles = table.rows.map((_, yi) => {
      const textStyle = getTableTextStyle(
        style,
        this.style.block.paragraph,
        yi
      );
      const indent = {
        normal: getUnit(
          textStyle.indent ?? DEFAULT_TABLE_INDENT,
          textStyle.size
        ),
        first: getUnit(
          textStyle?.firstIndent ?? DEFAULT_TABLE_FIRST_INDENT,
          textStyle.size
        ),
      };

      return {
        textStyle,
        indent,
        pre: textStyle.pre ?? false,
        space: textStyle.space ?? DEFAULT_TEXT_SPACE(),
        padding: style?.padding?.(yi),
      };
    });

    // セルの幅を計算
    const widths = [];
    for (let xi = 0; xi < table.rows[0].length; xi++) {
      // 幅が指定される場合はその値を用いる
      const width = table.widths?.[xi];
      if (width !== undefined && width !== null) {
        widths.push(width);
        continue;
      }

      // 文字の横幅を測り、その最大値を使用
      const columnWidths: number[] = [0];

      for (let yi = 0; yi < table.rows.length; yi++) {
        const { textStyle, indent, pre, space, padding } = lineStyles[yi];

        const { lineInfos } = this.calculateLineInfos(
          table.rows[yi][xi] as InlineWithId[][],
          this.width,
          textStyle,
          { pre, align: "left", indent, space }
        );
        if (lineInfos.length > 0) {
          columnWidths.push(
            lineInfos[0].at(-1)!.x +
              lineInfos[0].at(-1)!.width +
              (padding?.left ?? 0) +
              (padding?.right ?? 0)
          );
        }
      }
      widths.push(Math.max(...columnWidths));
    }

    const info: TableInfo = {
      type: "table",
      rows: [],
      horizontalBorders: table.horizontalBorders,
      verticalBorders: table.verticalBorders,
      style: table.style,
      label: table.label,
      id: table.id,
    };

    // セルを組版
    for (let yi = 0; yi < table.rows.length; yi++) {
      const cellInfos: TableCellInfo[] = [];
      const row = table.rows[yi];
      let x = 0;

      for (let xi = 0; xi < row.length; xi++) {
        const { textStyle, indent, pre, space, padding } = lineStyles[yi];
        const { lineInfos, lineRectInfos, lineToFootnotes } =
          this.calculateLineInfos(
            row[xi] as InlineWithId[][],
            widths[xi] - ((padding?.left ?? 0) + (padding?.right ?? 0)),
            textStyle,
            { pre, align: "left", indent, space }
          );

        cellInfos.push({
          x,
          width: widths[xi],
          lines: lineInfos,
          lineRects: lineRectInfos,
          lineToFootnotes,
        });
        x += widths[xi];
      }
      info.rows.push(cellInfos);
    }

    return info;
  }

  /**
   * 行情報を計算する
   */
  private calculateLineInfos = (
    lines: InlineWithId[][],
    width: number,
    textStyle: TextStyle,
    options: {
      pre: boolean;
      align: TextAlign;
      indent: Indent;
      space: TextSpace;
    }
  ) => {
    const { pre, align, indent, space } = options;

    const lineInfos: CharInfo[][] = [];
    const lineRectInfos: CharRectInfo[][] = [];
    const lineToFootnotes: string[][] = [];

    for (const inlines of lines) {
      unifyInlineStyle(inlines, this.style.command ?? {});

      const noSpaceLine = (() => {
        const inlineStyle = textToInlineStyleWithoutBoxStyle(textStyle);
        const tempLine = inlinesToTempCharInfo(
          inlines as InlineWithId[],
          inlineStyle
        );
        return pre ? tempLine : removeJaEnSpaces(tempLine);
      })();

      // 空行
      if (noSpaceLine.length === 0) {
        lineInfos.push([]);
        lineRectInfos.push([]);
        lineToFootnotes.push([]);
        continue;
      }

      // 行分割処理
      let index = 0;
      while (index < noSpaceLine.length) {
        // 左インデント・幅を計算
        const leftIndent =
          indent.normal + (lineInfos.length === 0 ? indent.first : 0);
        const actualWidth = width - leftIndent;

        if (!pre) {
          // 左端のホワイトスペースを削除
          const tempLeftLine = noSpaceLine.slice(index);
          index += trimStartSpaces(tempLeftLine);
        }

        const leftLine = noSpaceLine.slice(index);
        let splitIndex = getSplitIndex(leftLine, actualWidth, indent, space);
        const ends = index + splitIndex >= noSpaceLine.length;
        if (!pre) {
          // 右端のホワイトスペースを削除
          const tempCurrentLine = leftLine.slice(0, splitIndex);
          splitIndex = trimEndSpaces(tempCurrentLine);
        }

        // 空白のみになった場合は分割終了
        const currentLine = leftLine.slice(0, splitIndex);
        if (currentLine.length === 0) {
          break;
        }
        index += splitIndex;

        const charPositions = calculateCharPositions(
          currentLine,
          actualWidth,
          align,
          leftIndent,
          ends,
          textStyle.size,
          indent,
          space
        );

        // CharInfo, CharRectInfo を生成
        const newLine: CharInfo[] = [];
        const newRectLine: CharRectInfo[] = [];
        const newFootnotes: string[] = [];
        const rectStarts: Record<string, { x: number; starts: boolean }> = {};

        for (let i = 0; i < currentLine.length; i++) {
          const tempCharInfo = currentLine[i];
          const { x, y, width } = charPositions[i];
          newLine.push({
            char: tempCharInfo.char,
            x,
            y,
            width,
            size: tempCharInfo.style.size,
            font: tempCharInfo.style.font,
            color: tempCharInfo.style.color,
          });

          for (const orderedCommand of tempCharInfo.orderedCommands) {
            const { command, position } = orderedCommand;
            const starts = position.includes("start");
            const ends = position.includes("end");

            // 脚注の参照を記録
            if (starts) {
              if (command.footnoteRef) {
                newFootnotes.push(command.footnoteRef);
              }
            }

            // 矩形の開始位置を記録
            if (starts || i === 0) {
              rectStarts[command.id] = {
                x,
                starts,
              };
            }

            // 矩形を追加
            if (ends || i === currentLine.length - 1) {
              const rectStart = rectStarts[command.id];
              const topPadding = command.style?.padding?.top ?? 0;
              const bottomPadding = command.style?.padding?.bottom ?? 0;
              const leftPadding = rectStart.starts
                ? command.style?.padding?.left ?? 0
                : 0;
              const rightPadding = ends
                ? command.style?.padding?.right ?? 0
                : 0;

              // 装飾
              // 途中で途切れる場合は、左右のボーダ、パディングを省略
              let decoration: Decoration | undefined;
              if (drawsDecoration(command.style ?? {})) {
                decoration = clone(command.style);
                if (decoration?.border) {
                  if (!rectStart.starts) {
                    decoration.border.left = undefined;
                  }
                  if (!ends) {
                    decoration.border.right = undefined;
                  }
                }
              }

              newRectLine.push({
                x: rectStart.x - leftPadding,
                y: y - topPadding,
                width: x + width - rectStart.x + rightPadding + leftPadding,
                height: tempCharInfo.style.size + topPadding + bottomPadding,
                decoration,
                link: command.link,
              });
            }
          }
        }

        lineInfos.push(newLine);
        lineRectInfos.push(newRectLine);
        lineToFootnotes.push(newFootnotes);
      }
    }

    return {
      lineInfos,
      lineRectInfos,
      lineToFootnotes,
    };
  };
}
