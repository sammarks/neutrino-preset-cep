import test from 'ava'
import { Neutrino } from 'neutrino'

test('loads preset', t => {
  t.notThrows(() => require('..'))
})

test('uses preset', t => {
  const api = Neutrino()
  t.notThrows(() => api.use(require('..'), {
    packageJson: {
      name: 'test-plugin',
      version: '0.0.1',
      manifest: {
        extensions: {
          "panel": {
            "type": "panel",
            "title": "Adobe Plugin"
          }
        }
      }
    }
  }))
})
