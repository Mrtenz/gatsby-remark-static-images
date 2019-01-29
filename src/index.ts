import * as path from 'path';
import * as fs from 'fs';
import slash from 'slash';
import isRelative from 'is-relative-url';

/**
 * Recursively loop over an object with children, to get all the children of a specific type. This
 * will keep the original reference to an object. Returns an array of all nodes with the given type.
 *
 * @template T
 * @param {T} node
 * @param {string} type
 * @returns {T[]}
 */
const getNodes = <T extends { type: string; children?: T[] }>(node: T, type: string): T[] => {
  const output: T[] = [];

  if (node.type === type) {
    output.push(node);
  }

  if (node.children) {
    node.children.forEach(child => output.push(...getNodes(child, type)));
  }

  return output;
};

// TODO: Replace `any` with proper typings
module.exports = ({
  files,
  markdownAST,
  markdownNode,
  pathPrefix,
  getNode
}: {
  files: any;
  markdownAST: any;
  markdownNode: any;
  pathPrefix?: string;
  getNode(node: any): any;
}): Promise<any> => {
  const imageNodes = getNodes(markdownAST, 'image');

  return Promise.all<any>(
    imageNodes.map(node => {
      if (!isRelative(node.url)) {
        return Promise.resolve();
      }

      const parentNode = getNode(markdownNode.parent);
      if (!parentNode || !parentNode.dir) {
        return Promise.resolve();
      }

      const imagePath = slash(path.resolve(parentNode.dir, node.url));
      const imageNode = files.find((file: any) => file.absolutePath === imagePath);
      if (!imageNode) {
        return Promise.resolve();
      }

      const name = `${imageNode.name}-${imageNode.internal.contentDigest}.${imageNode.extension}`;
      node.url = path.join(pathPrefix || '/', 'static', name);

      const imageFile = path.join(process.cwd(), 'public/static', name);
      return new Promise((resolve, reject) => {
        if (!fs.existsSync(imageFile)) {
          const readStream = fs.createReadStream(imagePath);
          const writeStream = fs.createWriteStream(imageFile);

          readStream.on('error', reject);
          writeStream.on('error', reject);
          writeStream.on('close', resolve);

          readStream.pipe(writeStream);
        } else {
          resolve();
        }
      });
    })
  );
};
