declare module 'himalaya' {
  interface Attribute {
    key: string;
    value: string;
  }

  interface HTMLNode {
    type: string;
    tagName: string;
    attributes: Attribute[];
    children?: HTMLNode[];
  }

  function parse(html: string): HTMLNode[];

  function stringify(nodes: HTMLNode[]): string;
}
