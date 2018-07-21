![][header-image]

[![CircleCI][circleci-image]][circleci-url]
[![NPM version][npm-version]][npm-url]
[![NPM downloads][npm-downloads]][npm-url]
![License][license]
![Issues][issues]

`neutrino-preset-cep` is a Neutrino preset that supports creating plugins for Adobe's CEP (Common Extensibility Platform).

## Get Started

```sh
npm install --save-dev neutrino-preset-cep
```

```js
module.exports = {
  use: ['neutrino-preset-cep']
}
```

Additionally, you'll need to provide some configuration options in your `package.json` (or in the `.neutrinorc.js` file).
See the [Configuration](#configuration) section below for more details.

### Project Layout

`neutrino-preset-cep` follows the standard [project layout](https://neutrinojs.org/project-layout.html) specified by
Neutrino. This means that by default all project source code should live in a directory named `src` in the root
of the project. Any ExtendScript source code should live in a directory named `extendscript` in the root of the
project, since it is compiled differently.

### Configuration

Here is the minimal configuration you'll need in `package.json` in order for this preset to function properly:

```json
{
  "name": "test-plugin",
  "version": "0.0.1",
  "manifest": {
    "extensions": {
      "panel": {
        "type": "panel",
        "title": "Adobe CEP Plugin"
      }
    }
  }
}
```

In this example, you'll be creating a plugin called "Adobe CEP Plugin" (with the identifier `test-plugin`), with
the following notes:

- **Frontend Source Code** located at `src/panel.jsx`
- **ExtendScript Code** located at `extendscript/panel.js`

#### More Complete Configuration

Here is an example of more complete configuration located in `package.json`:

```json
{
  "name": "adobe-plugin",
  "version": "0.0.1",
  "manifest": {
    "bundleName": "Adobe Plugin",
    "bundleId": "com.my-company.adobe-plugin",
    "hosts": {
      "AEFT": "13.0"
    },
    "requiredRuntimes": {
      "CSXS": "6.0"
    },
    "extensions": {
      "panel": {
        "type": "panel",
        "title": "Adobe Plugin",
        "size": [300, 300],
        "minSize": [200, 200],
        "maxSize": [400, 400]
      },
      "tutorial": {
        "type": "dialog",
        "title": "Adobe Plugin Tutorial",
        "size": [800, 600],
        "minSize": [800, 600],
        "maxSize": [800, 600]
      }
    }
  }
}
```

If you don't want to put your configuration in the `package.json` file, you can specify configuration inside
the options like so:

```js
module.exports = {
  use: ['neutrino-preset-cep', {
    packageJson: {
      name: 'adobe-plugin',
      version: '0.0.1',
      manifest: {
        foo: 'bar'
      }
    }
  }]
}
```

### Customizing

`neutrino-preset-cep` has the following options for itself:

- `options.packageJson` - Supply an object for this field similar to the structure of the `package.json` file. A detailed
    explanation on how to use this feature is above.

This preset makes use of the following presets and middleware, with their configuration paths specified.

- [@neutrinojs/react](https://neutrinojs.org/packages/react/) - `options.react`
- [@neutrinojs/compile-loader](https://neutrinojs.org/packages/compile-loader/) - `options.compileLoader`
- [neutrino-middleware-wrapper](https://github.com/sammarks/neutrino-middleware-wrapper) - `options.wrapper`
- [neutrino-middleware-xml](https://github.com/sammarks/neutrino-middleware-xml) - `options.xml`
- [neutrino-middleware-jsxbin](https://github.com/sammarks/neutrino-middleware-jsxbin) - `options.jsxbin`

So this means you could have configuration like so:

```js
module.exports = {
  use: ['neutrino-preset-cep', {
    react: {},
    compileLoader: {},
    wrapper: {},
    xml: {},
    jsxbin: {}
  }]
}
```

## Features

- Supports React for the extension frontends.
- Transpiles ExtendScript support back to ES5 and compiles using JSXBin.
- Generates a `manifest.xml` file in the proper `CSXS` folder using properties defined in `package.json`

[header-image]: https://raw.githubusercontent.com/sammarks/art/master/neutrino-preset-cep/header.jpg
[circleci-image]: https://img.shields.io/circleci/project/github/sammarks/neutrino-preset-cep.svg
[circleci-url]: https://circleci.com/gh/sammarks/neutrino-preset-cep/tree/master
[npm-version]: https://img.shields.io/npm/v/neutrino-preset-cep.svg
[npm-downloads]: https://img.shields.io/npm/dm/neutrino-preset-cep.svg
[npm-url]: https://www.npmjs.com/package/neutrino-preset-cep
[license]: https://img.shields.io/github/license/sammarks/neutrino-preset-cep.svg
[issues]: https://img.shields.io/github/issues/sammarks/neutrino-preset-cep.svg
