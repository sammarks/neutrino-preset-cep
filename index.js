const path = require('path')
const react = require('@neutrinojs/react')
const compileLoader = require('@neutrinojs/compile-loader')
const wrapper = require('neutrino-middleware-wrapper')
const xml = require('neutrino-middleware-xml')
const jsxbin = require('neutrino-middleware-jsxbin')
const webpack = require('webpack')
const merge = require('deepmerge')
const Case = require('case')

module.exports = (neutrino, options = {}) => {
  const packageJson = options.packageJson || neutrino.options.packageJson || {}
  const extendScriptClass = packageJson.extendScriptClass || Case.pascal(packageJson.name)
  const xmlData = {
    version: packageJson.version,
    bundleId: `com.ae-plugins.${packageJson.name}`,
    locales: ['All'],
    requiredRuntimes: {
      CSXS: '5.0'
    },
    ...(packageJson.manifest || {}),
    extensions: Object.keys((packageJson.manifest || {}).extensions || {}).reduce((extensions, key) => {
      extensions[key] = {
        commandLine: ['--enable-nodejs', '--allow-file-access-from-files', '--allow-file-access'],
        autoVisible: true,
        type: 'panel',
        title: 'Adobe Plugin',
        size: [300, 300],
        ...packageJson.manifest.extensions[key]
      }
      return extensions
    }, {})
  }

  // Override mains.
  neutrino.options.mains = merge(Object.keys(xmlData.extensions).reduce((mains, key) => {
    mains[key] = path.resolve(neutrino.options.source, key)
    return mains
  }, {}), options.mains || {})

  // Use React
  neutrino.use(react, merge({
    html: {
      title: packageJson.name
    },
    minify: {
      babel: false
    },
    targets: {
      browsers: ['chrome 27']
    }
  }, options.react || {}))

  // Custom middleware to override React.
  neutrino.use((neutrino) => {

    // Remap mains.
    Object.keys(xmlData.extensions).forEach((extensionKey) => {
      neutrino.config.entry(`${extensionKey}-extendscript`)
        .add(path.resolve(neutrino.options.root, 'extendscript', extensionKey))
      if (process.env.JSX_DEBUG) {
        neutrino.config.entry(`${extensionKey}-extendscript-debug`)
          .add(path.resolve(neutrino.options.root, 'extendscript', extensionKey))
      }
    })

    // Remove runtime-chunk + vendor-chunk as we want them separated (don't care too much about small sizes).
    neutrino.config.plugins.delete('runtime-chunk')
    neutrino.config.plugins.delete('vendor-chunk')

    // Disable chunk hashes (caching is not a concern in CEP).
    neutrino.config.output.filename('[name].js')

  })

  // Add compile-loader for the ExtendScript.
  neutrino.use(compileLoader, merge({
    include: [path.resolve(neutrino.options.root, 'extendscript')],
    babel: {
      presets: [
        ['babel-preset-env', {
          loose: true,
          targets: {
            browsers: ['ie >= 7']
          }
        }]
      ]
    },
    ruleId: 'compile-extendscript',
    useId: 'babel-extendscript'
  }, options.compileLoader || {}))

  // Add es3ify for the ExtendScript.
  neutrino.use((neutrino) => {
    neutrino.config.module
      .rule('compile-es3')
      .test(neutrino.regexFromExtensions())
      .post()
      .include
        .add(path.resolve(neutrino.options.root, 'extendscript'))
        .end()
      .use('es3ify')
        .loader(require.resolve('es3ify-loader'))
  })

  // Add neutrino-middleware-wrapper
  neutrino.use(wrapper, merge({
    test: /(-extendscript|-extendscript-debug)\.js$/,
    header: `var ${extendScriptClass} = (function() { return `,
    footer: ' })();'
  }, options.wrapper || {}))

  // Add neutrino-middleware-xml
  neutrino.use(xml, merge({
    files: [
      {
        template: path.join(__dirname, 'manifest_template.ejs'),
        filename: 'CSXS/manifest.xml',
        data: xmlData
      }
    ]
  }, options.xml || {}))

  // Add neutrino-middleware-jsxbin
  neutrino.use(jsxbin, merge({
    test: /-extendscript\.js$/
  }, options.jsxbin || {}))

  // Add webpack.DefinePlugin
  neutrino.config.plugin('define')
    .use(webpack.DefinePlugin, [{
      'process.env': {
        APP_VERSION: JSON.stringify(packageJson.version)
      }
    }])

  // Final configuration changes.
  neutrino.use((neutrino) => {
    // Remove externals (there are none).
    neutrino.config.externals(undefined)
  })
}
