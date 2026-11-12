/**
 * Сквозные проверки generator.js: контрольный запуск и сценарии ошибок
 * из условия, каждый — в отдельной копии проекта со старым report.html.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src', import.meta.url))
const CONTROL_TEXT = readFileSync(join(SRC, 'data', 'results.json'), 'utf8')
const SUMMARY = [
  'Участников: 7',
  'Средний результат: 60%',
  'Лучший результат: Анна — 6 из 6 (100%)',
  'Порог пройден: 4 из 7',
  'Отчёт: report.html',
  '',
].join('\n')
const copies = []

/** Копия src/ во временной папке; report.html в ней — старый отчёт. */
function makeCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'quiz-report-'))
  cpSync(SRC, dir, { recursive: true })
  copies.push(dir)
  return dir
}

/** Запускает генератор в копии проекта с путём к файлу результатов. */
function runGenerator(dir, inputPath) {
  return spawnSync(process.execPath, ['generator.js', inputPath], { cwd: dir, encoding: 'utf8' })
}

after(() => {
  for (const dir of copies) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('generator.js', () => {
  it('на контрольных данных печатает пять строк сводки и пишет новый отчёт', () => {
    const dir = makeCopy()
    writeFileSync(join(dir, 'report.html'), 'старый отчёт')
    const result = runGenerator(dir, './data/results.json')
    assert.equal(result.status, 0)
    assert.equal(result.stdout, SUMMARY)
    assert.equal(result.stderr, '')
    const html = readFileSync(join(dir, 'report.html'), 'utf8')
    assert.match(html, /Средний результат<br><strong>60%<\/strong>/)
    assert.match(html, /Анна — 6 из 6 \(100%\)/)
    assert.match(html, /<script>window\.reportData = \{"questionCount":6,/)
  })

  it('сохранённый src/report.html создан генератором из контрольных данных', () => {
    const dir = makeCopy()
    runGenerator(dir, './data/results.json')
    assert.equal(
      readFileSync(join(SRC, 'report.html'), 'utf8'),
      readFileSync(join(dir, 'report.html'), 'utf8'),
    )
  })

  const errorCases = [
    {
      title: 'нет файла',
      file: './data/missing.json',
      content: null,
      message: 'Ошибка чтения файла: ENOENT',
    },
    {
      title: 'сломан JSON: нет открывающей кавычки перед quizTitle',
      file: './data/broken.json',
      content: CONTROL_TEXT.replace('"quizTitle"', 'quizTitle"'),
      message: 'Ошибка данных',
    },
    {
      title: 'у Анны пять ответов при ключе из шести',
      file: './data/invalid-structure.json',
      content: CONTROL_TEXT.replace('"Анна", "answers": [1, 2, 0, 1, 2, 0]', '"Анна", "answers": [1, 2, 0, 1, 2]'),
      message: 'Ошибка структуры данных',
    },
  ]

  for (const { title, file, content, message } of errorCases) {
    it(`${title}: «${message}», код 1, отчёта нет`, () => {
      const dir = makeCopy()
      if (content !== null) {
        assert.notEqual(content, CONTROL_TEXT)
        writeFileSync(join(dir, file), content)
      }
      assert.ok(existsSync(join(dir, 'report.html')), 'в копии есть старый отчёт')
      const result = runGenerator(dir, file)
      assert.equal(result.stdout, `${message}\n`)
      assert.equal(result.status, 1)
      assert.equal(existsSync(join(dir, 'report.html')), false)
    })
  }

  it('сквозная проверка: первый ответ Егора 1 — средний 62%, Егор 1 из 6 (17%)', () => {
    const dir = makeCopy()
    const changed = CONTROL_TEXT.replace(
      '"Егор", "answers": [0, 0, 1, 0, 0, 1]',
      '"Егор", "answers": [1, 0, 1, 0, 0, 1]',
    )
    assert.notEqual(changed, CONTROL_TEXT)
    writeFileSync(join(dir, 'data', 'changed.json'), changed)
    const result = runGenerator(dir, './data/changed.json')
    assert.equal(result.status, 0)
    assert.equal(result.stdout, SUMMARY.replace('Средний результат: 60%', 'Средний результат: 62%'))
    const html = readFileSync(join(dir, 'report.html'), 'utf8')
    assert.match(html, /Средний результат<br><strong>62%<\/strong>/)
    assert.match(html, /Егор<\/span>\s*<span>1 из 6 \(17%\)/)
  })
})
