const { extname, dirname, resolve } = require('path')
const mkdirp = require('mkdirp')
const { readFileSync, appendFileSync } = require('fs')
const deasync = require('deasync')

const postcss = require('postcss')
const atImport = require('postcss-import')
const simpleVars = require('postcss-simple-vars')
const cssNext = require('postcss-cssnext')
const cssModules = require('postcss-modules')

const extensions = ['.css']

// return {results, token}
const getStylesFromStylesheet = (stylesheetPath, file) => {
  if (extensions.indexOf(extname(stylesheetPath)) !== -1) {
    const requiringFile = file.opts.filename
    const resolvedStylesheetPath = resolve(
      process.env.PWD,
      dirname(requiringFile),
      stylesheetPath
    )

    const source = readFileSync(resolvedStylesheetPath, 'utf8')

    let tokens = {}

    // TODO: load post css configs from `postcss.config.js`
    const plugins = [
      atImport,
      simpleVars,
      cssNext,
      cssModules({
        getJSON: (cssFileName, json, outputFileName) => {
          tokens = json
          console.log({ json })
        }
      })
    ]

    // read and process css with `postcss`
    const results = sync(
      postcss(plugins).process(source, {
        from: resolvedStylesheetPath,
        to: resolvedStylesheetPath
      })
    )

    return { results, tokens }
  }
}

const sync = promise => {
  let success, error
  promise.then(result => (success = { result }), err => (error = err))
  deasync.loopWhile(() => !(success || error))

  if (!success) {
    throw error
  }
  return success.result
}

const writeCssFile = (targetFilePath, content) => {
  mkdirp.sync(dirname(targetFilePath))
  appendFileSync(targetFilePath, content, 'utf8')
}

module.exports = function(babel) {
  const { types: t } = babel

  return {
    visitor: {
      CallExpression(path, state) {
        const { file, opts } = state
        const { callee: { name: calleeName }, arguments: args } = path.node
        const [{ value: stylesheetPath }] = args

        if (
          calleeName !== 'require' ||
          !args.length ||
          !t.isStringLiteral(args[0]) ||
          // only care about `.css`
          extensions.indexOf(extname(stylesheetPath)) === -1
        ) {
          return
        }

        const { results, tokens } = getStylesFromStylesheet(
          stylesheetPath,
          file
        )

        const expression = path.findParent(
          test => test.isVariableDeclaration() || test.isExpressionStatement()
        )
        path.replaceWith(
          t.objectExpression(
            Object.keys(tokens).map(token =>
              t.objectProperty(
                t.stringLiteral(token),
                t.stringLiteral(tokens[token])
              )
            )
          )
        )
      },
      ImportDeclaration(path, state) {
        const { file, opts } = state
        const stylesheetPath = path.node.source.value

        if (
          path.node.specifiers.length !== 1 ||
          extensions.indexOf(extname(stylesheetPath)) === -1
        ) {
          return
        }

        const { results, tokens } = getStylesFromStylesheet(
          stylesheetPath,
          file
        )

        const distStylesheetPath = resolve(process.env.PWD, opts.extractCss)
        // append all the compiled css into the dist css file
        writeCssFile(distStylesheetPath, results.css)

        const styles = t.objectExpression(
          Object.keys(tokens).map(token =>
            t.objectProperty(
              t.stringLiteral(token),
              t.stringLiteral(tokens[token])
            )
          )
        )
        const variableDeclaration = t.VariableDeclaration('var', [
          t.VariableDeclarator(path.node.specifiers[0].local, styles)
        ])
        // replace the import statement into `var styles = {}`
        path.replaceWith(variableDeclaration)
      }
    }
  }
}
