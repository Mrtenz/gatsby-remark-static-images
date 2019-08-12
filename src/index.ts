import * as path from 'path';
import * as fs from 'fs';
import slash from 'slash';
import isRelative from 'is-relative-url';
import { parse, stringify } from 'himalaya';

interface GatsbyFile {
  name: string;
  extension: string;
  absolutePath: string;
  internal: {
    contentDigest: string;
  };
}

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

interface GatsbyMarkdownNode {
  parent: string;
  internal: {
    contentDigest: string;
  };
  dir?: string;
}

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

module.exports = ({
  files,
  markdownAST,
  markdownNode,
  pathPrefix,
  getNode
}: {
  files: GatsbyFile[];
  markdownAST: MarkdownNode;
  markdownNode: GatsbyMarkdownNode;
  pathPrefix?: string;
  getNode(uuid: string): GatsbyMarkdownNode;
}): Promise<any> => {
  const imageNodes = getNodes(markdownAST, 'image');
  const htmlNodes = getNodes(markdownAST, 'html');

  const parentNode = getNode(markdownNode.parent);
  if (!parentNode || !parentNode.dir) {
    return Promise.resolve();
  }

  /**
   * Get a file node from a (relative) file url. Returns undefined if the file could not be found.
   *
   * @param {string} url
   */
  const getFileNode = (url: string): GatsbyFile | undefined => {
    const imagePath = slash(path.resolve(parentNode.dir!, url));

    return files.find(file => file.absolutePath === imagePath);
  };

  /**
   * Copy an image from the original directory to Gatsby's output folder.
   *
   * @param {string} imagePath
   * @param {string} outputPath
   */
  const processImage = (imagePath: string, outputPath: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(outputPath)) {
        const readStream = fs.createReadStream(imagePath);
        const writeStream = fs.createWriteStream(outputPath);

        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('close', resolve);

        readStream.pipe(writeStream);
      } else {
        resolve();
      }
    });
  };

  /**
   * Process all image nodes.
   *
   * @param {MarkdownNode[]} nodes
   */
  const processImageNodes = (nodes: MarkdownNode[]): Promise<any> => {
    return Promise.all(
      nodes.map(node => {
        if (!isRelative(node.url!)) {
          return Promise.resolve();
        }

        const fileNode = getFileNode(node.url!);
        if (!fileNode) {
          return Promise.resolve();
        }

        const imageName = `${fileNode.name}-${fileNode.internal.contentDigest}.${
          fileNode.extension
        }`;
        const imagePath = path.resolve(process.cwd(), 'public/static', imageName);

        node.url = slash(path.join(pathPrefix || '/', 'static', imageName));

        return processImage(fileNode.absolutePath, imagePath);
      })
    );
  };

  /**
   * Process all HTML nodes, by parsing the HTML and searching for any images.
   *
   * @param {MarkdownNode[]>} nodes
   */
  const processHtmlNodes = (nodes: MarkdownNode[]): Promise<any> => {
    return Promise.all([
      ...nodes.map(node => {
        const htmlASTNodes = parse(node.value!);
        const promises: Promise<any>[] = [];

        htmlASTNodes.forEach(htmlAST => {
          const htmlImageNodes = getNodes(htmlAST, 'element').filter(
            element => element.tagName === 'img'
          );

          htmlImageNodes.forEach(imageNode => {
            const src = imageNode.attributes.find(attribute => attribute.key === 'src');
            if (!src) {
              return Promise.resolve();
            }

            if (!isRelative(src.value)) {
              return Promise.resolve();
            }

            const fileNode = getFileNode(src.value);
            if (!fileNode) {
              return Promise.resolve();
            }

            const imageName = `${fileNode.name}-${fileNode.internal.contentDigest}.${
              fileNode.extension
            }`;
            const imagePath = path.resolve(process.cwd(), 'public/static', imageName);

            src.value = slash(path.join(pathPrefix || '/', 'static', imageName));

            promises.push(processImage(fileNode.absolutePath, imagePath));
          });
        });

        if (promises.length) {
          node.value = stringify(htmlASTNodes);
        }

        return promises;
      })
    ]);
  };

  return Promise.all([processImageNodes(imageNodes), processHtmlNodes(htmlNodes)]);
};
