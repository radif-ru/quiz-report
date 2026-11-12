/**
 * Тесты app.js на минимальном DOM-стабе в node:vm: три состояния фильтра,
 * экранирование имени и обновление без перезагрузки.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import vm from 'node:vm'

const APP = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
const REPORT = readFileSync(new URL('../src/report.html', import.meta.url), 'utf8')
const REPORT_DATA = JSON.parse(REPORT.match(/<script>window\.reportData = (.*)<\/script>/)[1])

/** Запускает app.js с данными отчёта; возвращает элементы и отправку формы. */
function loadApp(reportData = REPORT_DATA) {
  const handlers = {}
  const elements = {
    '#filter-form': {
      addEventListener(type, handler) {
        handlers[type] = handler
      },
    },
    '#filter': { value: 'all' },
    '#result-count': { textContent: 'Показано: 7 из 7' },
    '#result-list': { innerHTML: 'исходный список' },
  }
  const document = {
    querySelector(selector) {
      assert.ok(selector in elements, `неожиданный селектор ${selector}`)
      return elements[selector]
    },
  }
  vm.runInNewContext(APP, { window: { reportData }, document })

  return {
    elements,
    submit(value) {
      elements['#filter'].value = value
      let prevented = false
      handlers.submit({
        preventDefault() {
          prevented = true
        },
      })
      return prevented
    },
  }
}

/** Имена участников в HTML списка. */
function names(html) {
  return [...html.matchAll(/<span class="result-name">([^<]*)<\/span>/g)].map((m) => m[1])
}

describe('app.js', () => {
  const cases = [
    ['all', ['Анна', 'Борис', 'Вера', 'Глеб', 'Даша', 'Егор', 'Жанна'], 'Показано: 7 из 7'],
    ['passed', ['Анна', 'Борис', 'Вера', 'Жанна'], 'Показано: 4 из 7'],
    ['failed', ['Глеб', 'Даша', 'Егор'], 'Показано: 3 из 7'],
  ]

  for (const [filter, expected, count] of cases) {
    it(`${filter}: ${count}`, () => {
      const app = loadApp()
      assert.equal(app.submit(filter), true, 'preventDefault() вызван')
      assert.deepEqual(names(app.elements['#result-list'].innerHTML), expected)
      assert.equal(app.elements['#result-count'].textContent, count)
    })
  }

  it('строка участника совпадает с разметкой генератора', () => {
    const app = loadApp()
    app.submit('all')
    const fromGenerator = REPORT.match(/<ul id="result-list" class="result-list">([\s\S]*?)\n {6}<\/ul>/)[1]
    assert.equal(app.elements['#result-list'].innerHTML, fromGenerator)
  })

  it('до отправки формы ничего не меняется', () => {
    const app = loadApp()
    assert.equal(app.elements['#result-list'].innerHTML, 'исходный список')
  })

  it('экранирует имя участника', () => {
    const app = loadApp({
      questionCount: 1,
      attempts: [{ name: '<img src=x>', score: 1, percentage: 100, passed: true, questionCount: 1 }],
    })
    app.submit('all')
    assert.match(app.elements['#result-list'].innerHTML, /&lt;img src=x&gt;/)
    assert.doesNotMatch(app.elements['#result-list'].innerHTML, /<img/)
  })

  it('собирает список через forEach и строковый аккумулятор, без join()', () => {
    const body = APP.slice(APP.indexOf('function renderAttempts'), APP.indexOf('function startFilter'))
    assert.match(body, /\.forEach\(/)
    assert.match(body, /\+= /)
    assert.match(body, /escapeHtml\(attempt\.name\)/)
    assert.match(body, /\.innerHTML = /)
    assert.doesNotMatch(APP, /\.join\(/)
  })
})
