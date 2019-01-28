const path = require('path');
const fs = require('fs');
const select = require('unist-util-select');
const isRelative = require('is-relative-url');
const slash = require('slash');

module.exports = ({ files, markdownAST, markdownNode, getNode, pathPrefix }) => {
  const imageNodes = select(markdownAST, 'image');

  return Promise.all(
    imageNodes.map(node => {
      if (!isRelative(node.url)) {
        return;
      }

      const parentNode = getNode(markdownNode.parent);
      if (!parentNode || !parentNode.dir) {
        return;
      }

      const imagePath = slash(path.resolve(parentNode.dir, node.url));
      const imageNode = files.find(file => file.absolutePath === imagePath);
      if (!imageNode) {
        return;
      }

      const name = `${imageNode.name}-${imageNode.internal.contentDigest}.${imageNode.extension}`;
      node.url = path.join(pathPrefix || '/', 'static', name).replace(/\\/g, '/');

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
