import { cmyk } from "@/style/figure.js";
import { CharStyle } from "@/style/style.js";
import {
  CommandWithId,
  InlineWithId,
  TempCharInfo,
  getCommandRanges,
  inlinesToTempCharInfo,
} from "./inline.js";

const baseStyle: CharStyle = {
  size: 4,
  font: "sample",
  color: cmyk(0, 0, 0, 100),
};

describe("getCommandRanges", () => {
  it("文字列の場合は空のオブジェクトを返す", () => {
    const inline = ["テキスト", "とテキスト"];
    const result = getCommandRanges(inline);
    const expected = {};
    expect(result).toEqual(expected);
  });

  it("コマンドの範囲を取得できる", () => {
    const inlines: InlineWithId[] = [
      "中に",
      {
        body: ["コマンド"],
        id: "command0",
      },
      "が",
      {
        body: ["ある"],
        id: "command1",
      },
    ];
    const result = getCommandRanges(inlines);
    const expected = {
      command0: { from: 2, to: 6 },
      command1: { from: 7, to: 9 },
    };
    expect(result).toEqual(expected);
  });

  it("入れ子のコマンドの範囲を取得できる", () => {
    const inlines: InlineWithId[] = [
      "中に",
      {
        body: [
          "コマンド",
          {
            body: ["が"],
            id: "command1",
          },
        ],
        id: "command0",
      },
      "がある",
    ];
    const result = getCommandRanges(inlines);
    const expected = {
      command0: { from: 2, to: 7 },
      command1: { from: 6, to: 7 },
    };
    expect(result).toEqual(expected);
  });
});

describe("inlineToTempCharInfo", () => {
  it("文字を処理できる", () => {
    const inlines = ["テキスト"];
    const result = inlinesToTempCharInfo(inlines, baseStyle);
    const expected: TempCharInfo[] = [..."テキスト"].map((char) => ({
      char,
      style: baseStyle,
      orderedCommands: [],
    }));
    expect(result).toEqual(expected);
  });

  it("コマンドを処理できる", () => {
    const command: CommandWithId = {
      body: ["テキスト"],
      id: "command",
    };
    const result = inlinesToTempCharInfo([command], baseStyle);
    const expected: TempCharInfo[] = [
      {
        char: "テ",
        style: baseStyle,
        orderedCommands: [{ command, position: "start" }],
      },
      {
        char: "キ",
        style: baseStyle,
        orderedCommands: [{ command, position: "middle" }],
      },
      {
        char: "ス",
        style: baseStyle,
        orderedCommands: [{ command, position: "middle" }],
      },
      {
        char: "ト",
        style: baseStyle,
        orderedCommands: [{ command, position: "end" }],
      },
    ];
    expect(result).toEqual(expected);
  });

  it("body が 1 文字のコマンドを処理できる", () => {
    const command: CommandWithId = {
      body: ["テ"],
      id: "command",
    };
    const result = inlinesToTempCharInfo([command], baseStyle);
    const expected: TempCharInfo[] = [
      {
        char: "テ",
        style: baseStyle,
        orderedCommands: [{ command, position: "start-end" }],
      },
    ];
    expect(result).toEqual(expected);
  });

  it("入れ子のコマンドを処理できる", () => {
    const innerCommand: CommandWithId = {
      body: ["マン"],
      id: "command1",
    };
    const command: CommandWithId = {
      body: ["コ", innerCommand, "ド"],
      id: "command0",
    };

    const result = inlinesToTempCharInfo([command], baseStyle);
    const expected: TempCharInfo[] = [
      {
        char: "コ",
        style: baseStyle,
        orderedCommands: [{ command, position: "start" }],
      },
      {
        char: "マ",
        style: baseStyle,
        orderedCommands: [
          { command, position: "middle" },
          { command: innerCommand, position: "start" },
        ],
      },
      {
        char: "ン",
        style: baseStyle,
        orderedCommands: [
          { command, position: "middle" },
          { command: innerCommand, position: "end" },
        ],
      },
      {
        char: "ド",
        style: baseStyle,
        orderedCommands: [{ command, position: "end" }],
      },
    ];
    expect(result).toEqual(expected);
  });

  it("複数重なったコマンドを処理できる", () => {
    const innerInnerCommand: CommandWithId = {
      body: ["マン"],
      id: "command2",
    };
    const innerCommand: CommandWithId = {
      body: [innerInnerCommand],
      id: "command1",
    };
    const command: CommandWithId = {
      body: ["コ", innerCommand, "ド"],
      id: "command0",
    };

    const result = inlinesToTempCharInfo([command], baseStyle);
    const expected: TempCharInfo[] = [
      {
        char: "コ",
        style: baseStyle,
        orderedCommands: [{ command, position: "start" }],
      },
      {
        char: "マ",
        style: baseStyle,
        orderedCommands: [
          { command, position: "middle" },
          { command: innerCommand, position: "start" },
          { command: innerInnerCommand, position: "start" },
        ],
      },
      {
        char: "ン",
        style: baseStyle,
        orderedCommands: [
          { command, position: "middle" },
          { command: innerCommand, position: "end" },
          { command: innerInnerCommand, position: "end" },
        ],
      },
      {
        char: "ド",
        style: baseStyle,
        orderedCommands: [{ command, position: "end" }],
      },
    ];
    expect(result).toEqual(expected);
  });
});
