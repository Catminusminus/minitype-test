import { Block, List } from "@/lib/block.js";
import { CustomExtender } from "@/plugin/index.js";

interface Reference {
  author: string;
  title: string;
  publisher: string;
  url: string;
}

export const referenceExtender =
  (data: string): CustomExtender =>
  async (block: Block) => {
    if (block.type !== "custom" || block.name !== "reference") {
      return [];
    }
    const lists: List[] = [];
    for (const line of block.lines) {
      if (!line.startsWith("- ")) {
        continue;
      }
      const url = line.slice(2);
      /*const response = await fetch(url);
      const text = await response.text();

      // タイトルの取得
      const matchedTitle = text.match(/<title>(.+)<\/title>/);
      if (!matchedTitle) {
        continue;
      }
      const title = matchedTitle[1];*/
      const title = "test";

      lists.push({
        type: "list",
        level: 1,
        lines: [[title, ", ", url]],
        style: {
          align: "left",
        },
      });
    }
    return lists;
  };
