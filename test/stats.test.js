/**
 * Тесты stats.js: проверка структуры данных, расчёт попытки и отчёта.
 * Запуск: npm test (встроенный node:test, без зависимостей).
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { calculateAttempt, calculateReport, validateQuizData } from '../src/stats.js'

const CONTROL = JSON.parse(
  readFileSync(new URL('../src/data/results.json', import.meta.url), 'utf8'),
)

const SAMPLE = {
  quizTitle: 'Проверка',
  correctAnswers: [1, 0, 2],
  attempts: [
    { name: '  Ира  ', answers: [1, 2, 2] },
    { name: 'Лев', answers: [0, 2, 1] },
  ],
}

/** Корректные данные с подменой одного поля корня. */
function withRoot(patch) {
  return { ...structuredClone(SAMPLE), ...patch }
}

/** Корректные данные с подменой первой попытки. */
function withAttempt(attempt) {
  return withRoot({ attempts: [attempt] })
}

describe('validateQuizData', () => {
  it('принимает корректные данные', () => {
    assert.equal(validateQuizData(SAMPLE), true)
    assert.equal(validateQuizData(CONTROL), true)
  })

  it('отклоняет корень не-объект, null и массив', () => {
    for (const root of [null, [], 'строка', 42, undefined]) {
      assert.equal(validateQuizData(root), false, String(root))
    }
  })

  it('требует непустую строку quizTitle', () => {
    for (const quizTitle of ['', undefined, 7, ['Проверка']]) {
      assert.equal(validateQuizData(withRoot({ quizTitle })), false)
    }
  })

  it('требует непустые массивы correctAnswers и attempts', () => {
    for (const value of [[], undefined, {}, 'abc']) {
      assert.equal(validateQuizData(withRoot({ correctAnswers: value })), false)
      assert.equal(validateQuizData(withRoot({ attempts: value })), false)
    }
  })

  it('проверяет каждую попытку: объект, имя после trim(), длину answers', () => {
    const invalid = [
      null,
      [],
      'Ира',
      { name: ' ', answers: [1, 2, 2] },
      { name: 5, answers: [1, 2, 2] },
      { answers: [1, 2, 2] },
      { name: 'Ира', answers: [1, 2] },
      { name: 'Ира', answers: '122' },
    ]
    for (const attempt of invalid) {
      assert.equal(validateQuizData(withAttempt(attempt)), false, JSON.stringify(attempt))
    }
  })

  it('не проверяет тип каждого ответа', () => {
    assert.equal(validateQuizData(withAttempt({ name: 'Ира', answers: ['1', null, 2] })), true)
  })
})

describe('calculateAttempt', () => {
  it('считает Бориса как в условии', () => {
    const boris = CONTROL.attempts.find((attempt) => attempt.name === 'Борис')
    assert.deepEqual(calculateAttempt(boris, CONTROL.correctAnswers), {
      name: 'Борис',
      score: 5,
      percentage: 83,
      passed: true,
    })
  })

  it('возвращает ровно четыре поля и обрезает имя', () => {
    const result = calculateAttempt(SAMPLE.attempts[0], SAMPLE.correctAnswers)
    assert.equal(JSON.stringify(result), '{"name":"Ира","score":2,"percentage":67,"passed":true}')
  })

  it('порог: 67% проходит, 60% — нет', () => {
    const key = [1, 1, 1, 1, 1]
    assert.equal(calculateAttempt({ name: 'А', answers: [1, 1, 1, 0, 0] }, key).passed, false)
    assert.equal(calculateAttempt({ name: 'Б', answers: [1, 1, 0] }, [1, 1, 1]).passed, true)
  })
})

describe('calculateReport', () => {
  it('совпадает с точным результатом check-stats.js', () => {
    assert.equal(
      JSON.stringify(calculateReport(SAMPLE)),
      '{"quizTitle":"Проверка","questionCount":3,"participantCount":2,"averagePercentage":34,' +
        '"passedCount":1,"threshold":67,"best":{"name":"Ира","score":2,"percentage":67,"passed":true},' +
        '"attempts":[{"name":"Ира","score":2,"percentage":67,"passed":true},' +
        '{"name":"Лев","score":0,"percentage":0,"passed":false}]}',
    )
  })

  it('считает контрольные данные: 7 участников, 60%, лучший — Анна', () => {
    const report = calculateReport(CONTROL)
    assert.deepEqual(Object.keys(report), [
      'quizTitle',
      'questionCount',
      'participantCount',
      'averagePercentage',
      'passedCount',
      'threshold',
      'best',
      'attempts',
    ])
    assert.equal(report.participantCount, 7)
    assert.equal(report.averagePercentage, 60)
    assert.equal(report.passedCount, 4)
    assert.equal(report.threshold, 67)
    assert.deepEqual(report.best, { name: 'Анна', score: 6, percentage: 100, passed: true })
    assert.deepEqual(
      report.attempts.map((attempt) => attempt.name),
      ['Анна', 'Борис', 'Вера', 'Глеб', 'Даша', 'Егор', 'Жанна'],
    )
  })

  it('при равном результате оставляет первого участника', () => {
    const data = withRoot({
      attempts: [
        { name: 'Первый', answers: [1, 0, 2] },
        { name: 'Второй', answers: [1, 0, 2] },
      ],
    })
    assert.equal(calculateReport(data).best.name, 'Первый')
  })

  it('не изменяет входные данные', () => {
    const data = structuredClone(SAMPLE)
    calculateReport(data)
    assert.deepEqual(data, SAMPLE)
  })
})
