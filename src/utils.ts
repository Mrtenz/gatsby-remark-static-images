/**
 * Recursively loop over an object with children, to get all the children of a specific type. This
 * will keep the original reference to an object. Returns an array of all nodes with the given type.
 *
 * @template T
 * @param {T} node
 * @param {string} type
 * @returns {T[]}
 */
export const getNodes = <T extends { type: string; children?: T[] }>(
  node: T,
  type: string
): T[] => {
  const output: T[] = [];

  if (node.type === type) {
    output.push(node);
  }

  if (node.children) {
    node.children.forEach((child) => output.push(...getNodes(child, type)));
  }

  return output;
};
