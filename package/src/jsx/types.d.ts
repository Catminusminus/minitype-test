import { MinitypeJSXElement, Renderable } from "./jsx-runtime.ts";


interface HasChildren {
    children?: Renderable;
  }
  
  declare global 
  {
  namespace JSX {
    interface IntrinsicElements {
      div: HasChildren;
      minitype: HasChildren;
    }
    type Element = MinitypeJSXElement | Inline | Block;
    interface ElementChildrenAttribute {
      children: unknown;
    }
  }
}