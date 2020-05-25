import fs from 'fs';
import { parse, stringify } from 'himalaya';
import isRelative from 'is-relative-url';
import path from 'path';
import slash from 'slash';
import { getNodes } from './utils';

interface FileNode {
  name: string;
  extension: string;
  absolutePath: string;
  internal: {
    contentDigest: string;
  };
}

interface MarkdownNode {
  parent: string;
  internal: {
    contentDigest: string;
  };
  dir?: string;
}

interface ASTNode {
  type: string;
  value?: string;
  url?: string;
  children?: ASTNode[];
}

const processStaticImages = async ({
  files,
  markdownAST,
  markdownNode,
  pathPrefix,
  getNode
}: {
  files: FileNode[];
  markdownAST: ASTNode;
  markdownNode: MarkdownNode;
  pathPrefix?: string;
  getNode(uuid: string): MarkdownNode;
}): Promise<void> => {
  const imageNodes = getNodes(markdownAST, 'image');
  const htmlNodes = getNodes(markdownAST, 'html');

  const parentNode = getNode(markdownNode.parent);
  if (!parentNode || !parentNode.dir) {
    return;
  }

  /**
   * Get a file node from a (relative) file url. Returns undefined if the file could not be found.
   *
   * @param {string} url
   */
  const getFileNode = (url: string): FileNode | undefined => {
    const imagePath = slash(path.resolve(parentNode.dir!, url));

    return files.find(file => file.absolutePath === imagePath);
  };

  /**
   * Copy an image from the original directory to Gatsby's output folder.
   *
   * @param {string} imagePath
   * @param {string} outputPath
   */
  const processImage = (imagePath: string, outputPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(outputPath)) {
        const readStream = fs.createReadStream(imagePath);
        const writeStream = fs.createWriteStream(outputPath);

        readStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('close', resolve);

        return readStream.pipe(writeStream);
      }

      resolve();
    });
  };

  /**
   * Get the full path to store an image for a specific FileNode.
   *
   * @param {FileNode} fileNode
   * @return {string}
   */
  const getFileName = (fileNode: FileNode): string => {
    return `${fileNode.name}-${fileNode.internal.contentDigest}.${fileNode.extension}`;
  };

  /**
   * Get the full path to use for an image node.
   *
   * @param fileNode
   */
  const getFilePath = (fileNode: FileNode): string => {
    return slash(path.join(pathPrefix || '/', 'static', getFileName(fileNode)));
  };

  /**
   * Process a FileNode as image. Returns the full path of the new image.
   *
   * @param {FileNode} fileNode
   * @return {Promise<string>}
   */
  const processFileNode = (fileNode: FileNode): Promise<void> => {
    const fileName = getFileName(fileNode);
    const imagePath = path.resolve(process.cwd(), 'public/static', fileName);

    return processImage(fileNode.absolutePath, imagePath);
  };

  /**
   * Process all image nodes.
   *
   * @param {ASTNode[]} nodes
   */
  const processImageNodes = (nodes: ASTNode[]): Array<Promise<void>> => {
    return nodes.map(async node => {
      if (!isRelative(node.url!)) {
        return;
      }

      const fileNode = getFileNode(node.url!);
      if (!fileNode) {
        return;
      }

      node.url = getFilePath(fileNode);
      return processFileNode(fileNode);
    });
  };

  /**
   * Process all HTML nodes, by parsing the HTML and searching for any images.
   *
   * @param {MarkdownNode[]>} nodes
   */
  const processHtmlNodes = (nodes: ASTNode[]): Array<Promise<void>> => {
    return nodes.flatMap(node => {
      const htmlASTNodes = parse(node.value!);

      const promises = htmlASTNodes
        .flatMap(htmlAST => getNodes(htmlAST, 'element'))
        .filter(element => element.tagName === 'img')
        .map(async imageNode => {
          const src = imageNode.attributes.find(attribute => attribute.key === 'src');
          if (!src) {
            return;
          }

          if (!isRelative(src.value)) {
            return;
          }

          const fileNode = getFileNode(src.value);
          if (!fileNode) {
            return;
          }

          src.value = getFilePath(fileNode);
          return processFileNode(fileNode);
        });

      if (promises.length) {
        node.value = stringify(htmlASTNodes);
      }

      return promises;
    }, []);
  };

  await Promise.all<void>([...processImageNodes(imageNodes), ...processHtmlNodes(htmlNodes)]);
};

export default processStaticImages;
