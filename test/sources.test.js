/**
 * Статические проверки сдаваемой папки: состав файлов, неизменённые готовые
 * функции Starter, отсутствие TODO и требования к стилям.
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const read = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')

// SHA-256 исходного текста готовых функций из архива Starter
const READY_FUNCTIONS = {
  'app.js': {
    escapeHtml: '298e968805f8a80a7946219cb3d558a51ab3299cc3c2c69a8cb73e562db360f2',
  },
  'generator.js': {
    escapeHtml: '298e968805f8a80a7946219cb3d558a51ab3299cc3c2c69a8cb73e562db360f2',
    serializeForScript: 'c18a0537ba989e745673d416c5ec9b7f55d0449cef8f40cfa66f6235a272408a',
    createAttemptMarkup: '9a121e24f48130e50588e166e303d62189a614534c36d8a72381f9dbdbe304cb',
    createReportHtml: '02aba7386f752d31081c8c8e964bc4e93f3069414141c18b043a1f34f1ad8e49',
    removePreviousReport: '79af8c9ab163cdf8164dd85835c4167653664f4c0a6a72b3c215120f66ce78e5',
    fail: 'c03a81cffc0a9ab9b443728af0768dc6628f12083cdc67135a269fbd67233c3a',
  },
  'stats.js': {
    isArray: '09b540aa011ea8bf2a4aff5bf66e97b516e7f0e9ebdad90fcf95316c8bd71602',
  },
}

/** Текст функции верхнего уровня от объявления до закрывающей скобки. */
function functionSource(source, name) {
  const match = new RegExp(`^(async )?function ${name}\\(`, 'm').exec(source)
  assert.ok(match, `функция ${name} не найдена`)
  return source.slice(match.index, source.indexOf('\n}\n', match.index) + 2)
}

describe('сдаваемая папка src/', () => {
  it('содержит ровно семь файлов из условия', () => {
    const files = readdirSync(new URL('../src', import.meta.url), { recursive: true })
      .map(String)
      .sort()
    assert.deepEqual(files, [
      'app.js',
      'data',
      'data/results.json',
      'generator.js',
      'package.json',
      'report.html',
      'stats.js',
      'style.css',
    ])
  })

  it('package.json — ESM-проект со скриптом start', () => {
    const pkg = JSON.parse(read('package.json'))
    assert.equal(pkg.type, 'module')
    assert.equal(pkg.scripts.start, 'node generator.js')
    assert.equal(pkg.dependencies, undefined)
  })

  it('generator.js импортирует функции из stats.js после импорта fs', () => {
    const lines = read('generator.js').split('\n')
    assert.equal(lines[0], "import { readFile, unlink, writeFile } from 'node:fs/promises'")
    assert.equal(lines[1], "import { calculateReport, validateQuizData } from './stats.js'")
  })

  for (const [file, functions] of Object.entries(READY_FUNCTIONS)) {
    for (const [name, hash] of Object.entries(functions)) {
      it(`${file}: готовая функция ${name}() не изменена`, () => {
        const digest = createHash('sha256').update(functionSource(read(file), name)).digest('hex')
        assert.equal(digest, hash)
      })
    }
  }

  it('в редактируемых файлах нет TODO и отладочного вывода', () => {
    for (const file of ['app.js', 'stats.js', 'generator.js', 'style.css']) {
      assert.doesNotMatch(read(file), /TODO/, file)
    }
    assert.doesNotMatch(read('app.js') + read('stats.js'), /console\./)
  })

  it('style.css: три классовых селектора, цвета, padding, border, margin, без flex и grid', () => {
    const css = read('style.css')
    const classSelectors = new Set(css.match(/\.[a-z][\w-]*(?=[^{}]*\{)/g))
    assert.ok(classSelectors.size >= 3, [...classSelectors].join(', '))
    for (const property of ['color', 'background-color', 'padding', 'border', 'margin']) {
      assert.match(css, new RegExp(`(^|[\\s;{])${property}\\s*:`), property)
    }
    assert.doesNotMatch(css, /flex|grid/)
  })
})
