import { Block } from "../lib/block.js";
import { Command, Inline } from "../lib/inline.js";

type FuncTag = ((props: Record<string, unknown>) => MinitypeJSXElement)
  | ((props: Record<string, unknown>) => Block)
  | ((props: Record<string, unknown>) => Inline)

export interface MinitypeJSXElement {
    tag: string | FuncTag;
    props: Record<string, unknown>;
}

export function jsx(
    tag: string | FuncTag,
    props: Record<string, unknown>,
): MinitypeJSXElement {
    return { tag, props };
}

export type Renderable =
  | Block
  | Inline
  | MinitypeJSXElement
  | Renderable[]
  | null
  | undefined;

function isCommand(arg: MinitypeJSXElement | Block | Command): arg is Command {
    return arg.hasOwnProperty("body");
}

function isBlock(arg: MinitypeJSXElement | Block): arg is Block {
    return arg.hasOwnProperty("type");
}

export function render(renderable: Renderable): Block | Block[] | Inline {
    if (Array.isArray(renderable)) {
        return renderable.map(render) as Block[];
      }
    if (renderable === undefined || renderable === null) {
        return "";
    }
    if (typeof renderable === "string" || isCommand(renderable) || isBlock(renderable)) {
        return renderable;
    }
    const { tag, props } = renderable;
    console.log("TAG: ", typeof tag);
    console.log("props", props);
    if (typeof tag === "function") {
        console.log(props.children);
        const renderedProps = render(props.children as any);
        return render(tag({...props, children: renderedProps}));
    }
    const { children, ...rest } = props;
    if (tag === "div") {
        console.log(children);
        return Array.isArray(children) ? render(children as Block[]) : render(children as Block);
    }
    return Array.isArray(children) ? children as Block[] : children as Block;
}
  
  export { jsx as jsxs };
