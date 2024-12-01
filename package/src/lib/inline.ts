import { Color } from "@/style/figure.js";
import {
  CharStyle,
  CommandStyle,
  CommandStyleRecord,
  Decoration,
  mixCharStyle,
  mixCommandStyle,
} from "@/style/style.js";

export type Inline = Command | string;

export type InlineWithId = CommandWithId | string;

export interface Command {
  body: Inline[];
  name?: string;
  attrs?: string[];
  style?: Partial<CommandStyle>;
  link?: Link;
  footnoteRef?: string;
  math?: string;
  label?: string;
  id?: string;
}

export type Link =
  | { type: "url"; url: string }
  | { type: "destination"; destination: string };

export type CommandWithId = Omit<Command, "body" | "id"> & {
  body: InlineWithId[];
  id: string;
};

export interface TempCharInfo {
  char: string;
  style: CharStyle;
  // 関連する Command を浅い順に並べたリスト
  orderedCommands: OrderedCommand[];
}

interface OrderedCommand {
  command: CommandWithId;
  position: CommandPosition;
}

type CommandPosition = "start" | "middle" | "end" | "start-end";

export interface CharInfo {
  char: string;
  x: number;
  y: number;
  width: number;
  size: number;
  font: string;
  color: Color;
}

export interface CharRectInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  decoration?: Decoration;
  link?: Link;
}

interface CommandRange {
  from: number;
  to: number;
}

export const footnoteCommandName = "fn";

export const unifyInlineStyle = (
  inlines: Inline[],
  commandStyles: CommandStyleRecord,
) => {
  for (const inline of inlines) {
    if (isCommand(inline)) {
      if (inline.name && inline.name in commandStyles) {
        inline.style = mixCommandStyle(
          inline.style ?? {},
          commandStyles[inline.name],
        );
      }
      unifyInlineStyle(inline.body, commandStyles);
    }
  }
};

export const getCommandRanges = (inlines: InlineWithId[]) => {
  let index = 0;

  const process = (inlines: InlineWithId[]): Record<string, CommandRange> => {
    let newCommandIdToIndex: Record<string, CommandRange> = {};

    for (const inline of inlines) {
      // 文字列
      if (!isCommand(inline)) {
        index += inline.length;
        continue;
      }

      // コマンド
      const fromIndex = index;
      const result = process(inline.body);
      newCommandIdToIndex = { ...newCommandIdToIndex, ...result };
      newCommandIdToIndex[inline.id] = {
        from: fromIndex,
        to: index,
      };
    }
    return newCommandIdToIndex;
  };

  return process(inlines);
};

export const inlinesToTempCharInfo = (
  inlines: InlineWithId[],
  textCharStyle: CharStyle,
): TempCharInfo[] => {
  const commandRanges = getCommandRanges(inlines);
  const tempCharInfos: TempCharInfo[] = [];

  const getPosition = (command: CommandWithId, index: number) => {
    const range = commandRanges[command.id];
    const starts = index === range.from;
    const ends = index === range.to - 1;
    return starts && ends
      ? "start-end"
      : starts
        ? "start"
        : ends
          ? "end"
          : "middle";
  };

  const process = (
    inlines: InlineWithId[],
    baseStyle: CharStyle,
    untilCommands: CommandWithId[],
  ) => {
    for (const inline of inlines) {
      const isObj = isCommand(inline);

      // スタイルの算出
      const inlineStyle = isObj ? inline.style ?? {} : {};
      const style = mixCharStyle(inlineStyle, baseStyle);

      if (typeof inline === "string") {
        for (const char of inline) {
          const index = tempCharInfos.length;
          tempCharInfos.push({
            char,
            style,
            orderedCommands: untilCommands.map((command) => ({
              command,
              position: getPosition(command, index),
            })),
          });
        }
        continue;
      }

      process(inline.body, style, [...untilCommands, inline]);
    }
  };

  process(inlines, textCharStyle, []);
  return tempCharInfos;
};

export const isCommand = (inline: Inline): inline is Command => {
  return typeof inline === "object";
};
