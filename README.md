# babel-plugin-postcss-cssmodules-transform
Babel plugin transform and extract PostCSS and CSS Modules to static CSS

### Status

This plugin is still at a very early stage and features are incomplete.

### This plugin does two things:

```JavaScript
// index.js
import styles from './index.module.css'
```

```CSS
/* index.module.css */
.root {
  display: flex;
}
```

Into an object that has properties mirroring the styles name in the compiled JS file:

```JavaScript
// index.js
var styles = {"root":"_root_amfqe_1"};
```

And extract to `styles.css`

```CSS
/* styles.css */
._root_amfqe_1 {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
}
```

### Usage

Install from NPM

```sh
$ yarn add @envato/babel-plugin-postcss-cssmodules-transform -D
```

Add the plugin to `.babelrc`.


```JSON
{
  "presets": [
    ["@babel/env", {
      "targets": {
        "browsers": ["last 2 versions"]
      }
    }],
    "@babel/stage-3",
    "@babel/react",
    "@babel/typescript"
  ],
  "plugins": [
    ["@envato/babel-plugin-postcss-cssmodules-transform", {
      "extractCss": "./dist/styles.css"
    }]
  ]
}
```

### Todo

- [ ] support `require('./index.module.css')` syntax
- [ ] support `postcss.config.js`
- [ ] unit test

### Alternatives

This plugin is based on the two plugins below, and modified to support `extractCss` option with full `postcss` plugin support.

* [babel-plugin-css-modules-transform](https://github.com/michalkvasnicak/babel-plugin-css-modules-transform)
* [babel-plugin-transform-postcss](https://github.com/wbyoung/babel-plugin-transform-postcss)

### License
MIT
