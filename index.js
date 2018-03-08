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
      ImportDeclaration(path, state) {
        const { file, opts } = state
        const stylesheetPath = path.node.source.value

        if (path.node.specifiers.length !== 1) {
          return
        }

        // match `import styles from './index.module.css'` statemenet
        if (extensions.indexOf(extname(stylesheetPath)) !== -1) {
          const requiringFile = file.opts.filename
          const resolvedStylesheetPath = resolve(
            process.env.PWD,
            dirname(requiringFile),
            stylesheetPath
          )

          const source = readFileSync(resolvedStylesheetPath, 'utf8')

          let tokens = {}
          const plugins = [
            atImport,
            simpleVars,
            cssNext,
            cssModules({
              getJSON: function(cssFileName, json, outputFileName) {
                tokens = json
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
}
