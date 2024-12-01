import { Block } from "@/lib/block.js";
import { Command, isCommand } from "@/lib/inline.js";
import { LabelMap } from "@/lib/label.js";

export type CustomExtender = (block: Block) => Block[] | Promise<Block[]>;

export type BlockTransformer = (block: Block, env: TransformerEnv) => void;

export type CommandTransformer = (
  command: Command,
  env: CommandTransformerEnv,
) => void;

export type TransformerEnv = {
  labelMap: LabelMap;
  blockOperation: BlockOperation;
};

export type CommandTransformerEnv = TransformerEnv;

export interface BlockOperation {
  block: Block;
  roots: BlockOperation[];
  parent?: BlockOperation;
  children?: BlockOperation[];
  first: BlockOperation;
  last: BlockOperation;
  prev?: BlockOperation;
  next?: BlockOperation;
}

/**
 * BlockOperation を作成する
 * @param roots ルートの場合のみ省略
 */
// TODO: テストを書く
export const createBlockOperations = (
  blocks: Block[],
  parentOp?: BlockOperation,
  roots?: BlockOperation[],
) => {
  if (blocks.length === 0) {
    return [];
  }

  const operations: BlockOperation[] = [];

  for (const block of blocks) {
    const op: BlockOperation = {
      block: block,
      roots: roots ?? operations,
      parent: parentOp,
      // 後ほど設定するので一旦 null を入れる
      first: null!,
      last: null!,
    };
    operations.push(op);

    // 再帰的に設定
    if (block.type === "box") {
      operations.at(-1)!.children = createBlockOperations(
        block.blocks,
        op,
        roots ?? operations,
      );
    }
  }

  for (let i = 0; i < operations.length; i++) {
    // 最初／最後のブロックを設定
    const op = operations[i];
    op.first = operations[0];
    op.last = operations.at(-1)!;

    // 前後のブロックを設定
    if (i > 0) {
      op.prev = operations[i - 1];
    }
    if (i < operations.length - 1) {
      op.next = operations[i + 1];
    }
  }
  return operations;
};

/**
 * Transformer を適用する
 */
export const applyTransformer = (
  blocks: Block[],
  blockTransformers: BlockTransformer[],
  commandTransformers: CommandTransformer[],
  labelMap: LabelMap,
  blockOperations?: BlockOperation[],
) => {
  // ルートの場合のみ初期化
  const currentOperations: BlockOperation[] =
    blockOperations ?? createBlockOperations(blocks);

  // TransformerEnv を作成
  const envs = currentOperations.map<TransformerEnv>((op) => ({
    labelMap,
    blockOperation: op,
  }));

  // BlockTransformer
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    for (const transformer of blockTransformers) {
      transformer(block, envs[i]);
    }

    // ボックスの子ブロックに対して再帰的に適用
    if (block.type === "box") {
      applyTransformer(
        block.blocks,
        blockTransformers,
        commandTransformers,
        labelMap,
        currentOperations[i].children,
      );
    }
  }

  // CommandTransformer
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!("lines" in block)) {
      continue;
    }
    for (const line of block.lines) {
      for (const inline of line) {
        if (isCommand(inline)) {
          applyCommandTransformer(inline, commandTransformers, envs[i]);
        }
      }
    }
  }
};

const applyCommandTransformer = (
  command: Command,
  transformers: CommandTransformer[],
  env: CommandTransformerEnv,
) => {
  for (const transformer of transformers) {
    transformer(command, env);
  }
  // コマンドの内容に対して再帰的に適用
  for (const body of command.body) {
    if (isCommand(body)) {
      applyCommandTransformer(body, transformers, env);
    }
  }
};
