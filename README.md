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

### Customization ###

By default files are saved to public/static and named `${fileNode.name}-${fileNode.internal.contentDigest}.${fileNode.extension}`. This can be overridden like so:

```js
// gatsby-config.js
plugins: [
  {
    resolve: 'gatsby-transformer-remark',
    options: {
      plugins: [
        'gatsby-remark-static-images',
        generateImageName: (fileNode) => {
          return `${fileNode.internal.contentDigest}/${fileNode.name}.${fileNode.extension}`
        }
      ]
    }
  }
]
```
