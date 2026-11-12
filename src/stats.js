const PASSING_PERCENTAGE = 67

function isArray(value) {
  return Array.isArray(value)
}

/**
 * Проверяет, что значение — объект, но не null и не массив.
 * @param {unknown} value проверяемое значение
 * @returns {boolean}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !isArray(value)
}

/**
 * Проверяет структуру данных викторины: корень, название, ключ ответов
 * и каждую попытку.
 * @param {unknown} data разобранный JSON
 * @returns {boolean} true, только если выполнены все семь условий
 */
export function validateQuizData(data) {
  if (!isPlainObject(data)) {
    return false
  }
  if (typeof data.quizTitle !== 'string' || data.quizTitle === '') {
    return false
  }
  if (!isArray(data.correctAnswers) || data.correctAnswers.length === 0) {
    return false
  }
  if (!isArray(data.attempts) || data.attempts.length === 0) {
    return false
  }

  return data.attempts.every(
    (attempt) =>
      isPlainObject(attempt) &&
      typeof attempt.name === 'string' &&
      attempt.name.trim() !== '' &&
      isArray(attempt.answers) &&
      attempt.answers.length === data.correctAnswers.length,
  )
}

/**
 * Считает результат одной попытки.
 * @param {{ name: string, answers: Array<unknown> }} attempt попытка участника
 * @param {Array<unknown>} correctAnswers ключ правильных ответов
 * @returns {{ name: string, score: number, percentage: number, passed: boolean }}
 */
export function calculateAttempt(attempt, correctAnswers) {
  const score = attempt.answers.filter(
    (answer, index) => answer === correctAnswers[index],
  ).length
  const percentage = Math.round((score / correctAnswers.length) * 100)

  return {
    name: attempt.name.trim(),
    score,
    percentage,
    passed: percentage >= PASSING_PERCENTAGE,
  }
}

/**
 * Считает сводку по викторине и результаты всех попыток.
 * @param {{ quizTitle: string, correctAnswers: Array<unknown>, attempts: Array<object> }} data
 *   проверенные данные викторины
 * @returns {object} восемь полей отчёта
 */
export function calculateReport(data) {
  const attempts = data.attempts.map((attempt) =>
    calculateAttempt(attempt, data.correctAnswers),
  )
  const percentageSum = attempts.reduce((sum, attempt) => sum + attempt.percentage, 0)
  // При равном score остаётся первый лучший участник: заменяем только на больший
  const best = attempts.reduce((leader, attempt) =>
    attempt.score > leader.score ? attempt : leader,
  )

  return {
    quizTitle: data.quizTitle.trim(),
    questionCount: data.correctAnswers.length,
    participantCount: attempts.length,
    averagePercentage: Math.round(percentageSum / attempts.length),
    passedCount: attempts.filter((attempt) => attempt.passed).length,
    threshold: PASSING_PERCENTAGE,
    best,
    attempts,
  }
}
