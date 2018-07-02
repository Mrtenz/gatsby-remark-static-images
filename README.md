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
