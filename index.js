const path = require('path')
const react = require('@neutrinojs/react')
const compileLoader = require('@neutrinojs/compile-loader')
const wrapper = require('neutrino-middleware-wrapper')
const xml = require('neutrino-middleware-xml')
const jsxbin = require('neutrino-middleware-jsxbin')
const webpack = require('webpack')
const merge = require('deepmerge')
const Case = require('case')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WebpackShellPlugin = require('webpack-shell-plugin')

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
        type: 'Panel',
        title: 'Adobe Plugin',
        size: [300, 300],
        mainPath: `./${key}.html`,
        scriptPath: `./${key}-extendscript.jsxbin`,
        manifestOnly: false,
        showMenu: true,
        ...packageJson.manifest.extensions[key]
      }
      return extensions
    }, {})
  }

  // Override mains.
  neutrino.options.mains = merge(Object.keys(xmlData.extensions).reduce((mains, key) => {
    if (!xmlData.extensions[key].manifestOnly) {
      mains[key] = path.resolve(neutrino.options.source, key)
    }
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

  // Custom middleware to override React + add ExtendScript entries.
  neutrino.use((neutrino) => {

    // Babel Plugins
    neutrino.config.module.rule('compile').use('babel').tap(options => {
      const decoratorsPlugin = require.resolve('babel-plugin-transform-decorators-legacy')
      const classPropertiesPlugin = require.resolve('babel-plugin-transform-class-properties')
      options.plugins.unshift(decoratorsPlugin, classPropertiesPlugin)

      return options
    })

    // Remap mains.
    Object.keys(xmlData.extensions).forEach((extensionKey) => {
      if (!xmlData.extensions[extensionKey].manifestOnly) {
        neutrino.config.entry(`${extensionKey}-extendscript`)
          .add(require.resolve('es5-shim'))
          .add(require.resolve('es5-shim/es5-sham'))
          .add(path.resolve(neutrino.options.root, 'extendscript', extensionKey))
        if (process.env.JSX_DEBUG) {
          neutrino.config.entry(`${extensionKey}-extendscript-debug`)
            .add(require.resolve('es5-shim'))
            .add(require.resolve('es5-shim/es5-sham'))
            .add(path.resolve(neutrino.options.root, 'extendscript', extensionKey))
        }
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
            browsers: ['ie 7']
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
  const env = Object.keys(process.env).reduce((env, key) => {
    env[key] = JSON.stringify(process.env[key])
    return env
  }, {
    APP_VERSION: JSON.stringify(packageJson.version)
  })
  neutrino.config.plugin('define')
    .use(webpack.DefinePlugin, [{
      'process.env': env
    }])

  // Adding externals.
  const externals = Object.assign({
    'temp': 'commonjs temp',
    'mkdirp': 'commonjs mkdirp',
    'path': 'commonjs path',
    'fs': 'commonjs fs',
    'os': 'commonjs os',
    'child_process': 'commonjs child_process'
  }, options.externals || {})
  neutrino.use((neutrino) => {
    if (process.env.NODE_ENV !== 'development') {
      // Define externals.
      neutrino.config.externals(externals)
      // Define node config.
      Object.keys(externals).forEach((external) => {
        neutrino.config.node.set(external, false)
      })
    } else {
      Object.keys(externals).forEach((external) => {
        neutrino.config.node.set(external, 'empty')
      })
    }
  })

  // Copy static assets & dependencies.
  neutrino.config.plugin('copy-package-json')
    .use(CopyWebpackPlugin, [[
      path.join(neutrino.options.root, 'package.json'),
      path.join(neutrino.options.root, 'static')
    ]])
  neutrino.config.plugin('npm-install')
    .use(WebpackShellPlugin, [{
      onBuildEnd: [`(cd ${path.resolve(neutrino.options.output)} && npm install --production)`]
    }])

  // Add sourcemap plugin.
  neutrino.config.plugin('sourcemap')
    .use(webpack.SourceMapDevToolPlugin, [{
      test: neutrino.regexFromExtensions(),
      exclude: [/-extendscript\.js$/, /node_modules/],
      filename: '[name].map'
    }])
}
