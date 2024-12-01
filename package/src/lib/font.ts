import { Font, Path, PathCommand, load } from "opentype.js";
import sqlite from "sqlite3";

import { getFileName } from "./utils.js";

type Gid = number;
type Unicode = number;
type FileName = string;

type FontCache = {
  widths: Record<Gid, number>;
  commands: Record<Gid, PathCommand[]>;
  gids: Record<Unicode, Gid>;
  unitsPerEm: number;
} & (
  | {
      type: "db";
    }
  | {
      type: "file";
      font: Font;
    }
);

const fontCaches: Record<FileName, FontCache> = {};

/**
 * フォントを読み込む
 */
export const loadFonts = async (srcs: string[], db: sqlite.Database) => {
  // ファイル名のみを抽出
  const fileNameToSrc: Record<FileName, string> = {};
  for (const src of srcs) {
    const fileName = getFileName(src);
    fileNameToSrc[fileName] = src;
  }
  const fileNameSrcEntries = Object.entries(fileNameToSrc);

  // DB 内にキャッシュが存在するかを確認
  const fileNameIn = fileNameSrcEntries.map(([name]) => `'${name}'`).join(",");
  const fontRows = await new Promise<{ name: string; unitsPerEm: number }[]>(
    (resolve) =>
      db.all(`select * from font where name in (${fileNameIn})`, (_, rows) =>
        resolve(rows ? (rows as any) : [])
      )
  );

  // キャッシュを作成
  const promises: Promise<FontCache>[] = [];

  for (const [fileName, src] of fileNameSrcEntries) {
    const fontRow = fontRows.find((row) => row.name === fileName);
    try {
      promises.push(
        fontRow
          ? createFontCacheFromDB(fileName, fontRow.unitsPerEm, db)
          : createFontCacheFromFile(src)
      );
    } catch (e) {
      throw new Error(`Failed to load font: ${src}`);
    }
  }

  const resolvedCaches = await Promise.all(promises);
  for (let i = 0; i < fileNameSrcEntries.length; i++) {
    fontCaches[fileNameSrcEntries[i][0]] = resolvedCaches[i];
  }
};

/**
 * DB からフォントのキャッシュを復元する
 */
export const createFontCacheFromDB = async (
  name: string,
  unitsPerEm: number,
  db: sqlite.Database
) => {
  const selectWidth = new Promise<any[]>((resolve) => {
    db.all(`select * from width where name = '${name}'`, (err, rows) =>
      resolve(rows)
    );
  });
  const selectGids = new Promise<any[]>((resolve) => {
    db.all(`select * from gids where name = '${name}'`, (err, rows) =>
      resolve(rows)
    );
  });
  const [widths, gids] = await Promise.all([selectWidth, selectGids]);

  const cache: FontCache = {
    type: "db",
    widths: {},
    commands: {},
    unitsPerEm,
    gids: {},
  };
  for (const { gid, width } of widths) {
    cache.widths[gid] = width;
  }
  for (const { gid, unicode } of gids) {
    cache.gids[unicode] = gid;
  }
  return cache;
};

/**
 * フォントファイルを読み込む
 */
export const createFontCacheFromFile = async (src: string) => {
  const font = await load(`${src}.otf`);
  const cache: FontCache = {
    type: "file",
    widths: {},
    commands: {},
    unitsPerEm: font.unitsPerEm,
    gids: font.tables.cmap.glyphIndexMap,
    font,
  };
  return cache;
};

/**
 * コマンドのキャッシュを読み込む
 */
export const loadFontCommandsCaches = async (
  charMap: Record<FileName, Set<string>>,
  db: sqlite.Database
) => {
  for (const fileName in charMap) {
    const gidSet = new Set(
      [...charMap[fileName]].map((gid) => charToGid(gid, fileName))
    );
    // .notdef
    gidSet.add(0);
    const gidIn = [...gidSet].join(",");

    const commandsList = await new Promise<{ gid: Gid; commands: string }[]>(
      (resolve) =>
        db.all(
          `select gid, commands from commands where name = '${fileName}' and gid in (${gidIn})`,
          (_, rows) => resolve(rows as any)
        )
    );
    if (!commandsList) {
      return;
    }
    for (const { gid, commands } of commandsList) {
      fontCaches[fileName].commands[gid] = JSON.parse(commands);
    }
  }
};

/**
 * キャッシュを保存する
 */
export const saveFontCaches = async (db: sqlite.Database) => {
  const fonts: string[] = [];
  const widths: string[] = [];
  const gids: string[] = [];
  const commandsArray: string[][] = [[]];

  for (const name in fontCaches) {
    const cache = fontCaches[name];
    if (cache.type === "db") {
      continue;
    }

    fonts.push(`('${name}', ${fontCaches[name].unitsPerEm})`);

    // 全ての幅とグリフを追加
    for (let gid = 0; gid < cache.font.glyphs.length; gid++) {
      const glyph = cache.font.glyphs.get(gid);
      if (glyph.advanceWidth !== undefined) {
        if (commandsArray.at(-1)!.length > 1000) {
          commandsArray.push([]);
        }
        widths.push(`('${name}', ${gid}, ${glyph.advanceWidth})`);
        commandsArray
          .at(-1)!
          .push(
            `('${name}', ${gid}, '${JSON.stringify(glyph.path.commands)}')`
          );
      }
    }
    // GID を追加
    for (const [unicode, gid] of Object.entries(fontCaches[name].gids)) {
      gids.push(`('${name}', ${gid}, ${unicode})`);
    }
  }

  if (fonts.length === 0 || widths.length === 0 || gids.length === 0) {
    return;
  }

  await new Promise<void>((resolve) =>
    db.serialize(() => {
      db.run(
        "create table if not exists font (name text primary key, unitsPerEm integer)"
      );
      db.run(
        "create table if not exists width (name text, gid integer, width integer)"
      );
      db.run(
        "create table if not exists gids (name text, gid integer, unicode integer)"
      );
      db.run(
        "create table if not exists commands (name text, gid integer, commands text, unique (name, gid))"
      );

      db.run(`insert into font values ${fonts.join(", ")}`);
      db.run(`insert into width values ${widths.join(", ")}`, () => resolve());
      db.run(`insert into gids values ${gids.join(", ")}`, () => resolve());
    })
  );
  for (const commands of commandsArray) {
    await new Promise<void>((resolve) =>
      db.run(`insert into commands values ${commands.join(", ")}`, () =>
        resolve()
      )
    );
  }
  db.close();
};

/**
 * GID を取得する
 */
const charToGid = (char: string, fileName: string) => {
  const cache = fontCaches[fileName];
  return cache.type === "db"
    ? cache.gids[char.charCodeAt(0)] ?? 0
    : cache.font.charToGlyphIndex(char);
};

/**
 * グリフの幅を取得する
 */
export const getAdvanceWidth = (char: string, fileName: string) => {
  const cache = fontCaches[fileName];
  return cache.type === "db"
    ? cache.widths[charToGid(char, fileName)] / cache.unitsPerEm
    : cache.font.getAdvanceWidth(char, 1);
};

/**
 * グリフのパスを取得する
 */
export const getPath = (
  char: string,
  x: number,
  y: number,
  size: number,
  fileName: string
) => {
  const cache = fontCaches[fileName];
  const gid = charToGid(char, fileName);
  const commands =
    cache.type === "db"
      ? fontCaches[fileName].commands[gid]
      : cache.font.glyphs.get(gid).path.commands;

  return commandsToPath(
    x,
    y + size * 0.88,
    size,
    commands,
    fontCaches[fileName].unitsPerEm
  );
};

/**
 * PathCommand を SVG のパスコマンドに変換する
 */
const commandsToPath = (
  x: number,
  y: number,
  size: number,
  commands: PathCommand[],
  unitsPerEm: number
) => {
  const scale = (1 / (unitsPerEm || 1000)) * size;

  const path = new Path();
  for (let i = 0; i < commands.length; i += 1) {
    const cmd = commands[i];
    if (cmd.type === "M") {
      path.moveTo(x + cmd.x * scale, y - cmd.y * scale);
    }
    if (cmd.type === "L") {
      path.lineTo(x + cmd.x * scale, y - cmd.y * scale);
    }
    if (cmd.type === "Q") {
      path.quadraticCurveTo(
        x + cmd.x1 * scale,
        y - cmd.y1 * scale,
        x + cmd.x * scale,
        y - cmd.y * scale
      );
    }
    if (cmd.type === "C") {
      path.curveTo(
        x + cmd.x1 * scale,
        y - cmd.y1 * scale,
        x + cmd.x2 * scale,
        y - cmd.y2 * scale,
        x + cmd.x * scale,
        y - cmd.y * scale
      );
    }
    if (cmd.type === "Z") {
      path.closePath();
    }
  }
  return path.toPathData(4);
};
