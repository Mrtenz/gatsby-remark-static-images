# gatsby-remark-static-images

Copy images in markdown without processing them. Can be used in combination with `gatsby-remark-images` to copy SVG and GIF files. Make sure to place this plugin _after_ `gatsby-remark-images`.

## Getting started

```bash
yarn add --dev gatsby-remark-static-images
```

### Usage

```js
// gatsby-config.js
plugins: [
  {
    resolve: 'gatsby-transformer-remark',
    options: {
      plugins: [
        'gatsby-remark-static-images'
      ]
    }
  }
]
```

## Options

### `imageName`

This option lets you specify the output name for the image. It should be a function that takes a `File` node and returns the name of the image as a string.

Defaults to: `(node) => ${node.name}-${node.internal.contentDigest}.${node.extension}`.

#### Example

```js
{
  resolve: 'gatsby-remark-static-images',
  options: {
    imageName: (node) => `${node.name}.${node.extension}`
  }
}
```
