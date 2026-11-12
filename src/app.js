// Готовая защитная механика. Не изменяйте эту функцию.
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

/**
 * Возвращает попытки из window.reportData по значению фильтра.
 * @param {string} filter all — все, passed — прошедшие порог, failed — не прошедшие
 * @returns {Array<object>} попытки в исходном порядке
 */
function selectAttempts(filter) {
  const attempts = window.reportData.attempts

  if (filter === 'all') {
    return attempts
  }
  if (filter === 'passed') {
    return attempts.filter((attempt) => attempt.passed === true)
  }
  if (filter === 'failed') {
    return attempts.filter((attempt) => attempt.passed === false)
  }
  return []
}

/**
 * Собирает строки списка через forEach и строковый аккумулятор
 * и заменяет ими содержимое #result-list.
 * @param {Array<object>} attempts попытки для показа
 * @param {Element} [list] элемент списка; по умолчанию #result-list
 * @returns {string} вставленная HTML-строка
 */
function renderAttempts(attempts, list = document.querySelector('#result-list')) {
  let markup = ''

  attempts.forEach((attempt) => {
    const status = attempt.passed ? 'Порог пройден' : 'Порог не пройден'
    markup += `
          <li class="result-item">
            <span class="result-name">${escapeHtml(attempt.name)}</span>
            <span>${attempt.score} из ${attempt.questionCount} (${attempt.percentage}%) — ${status}</span>
          </li>`
  })

  list.innerHTML = markup
  return markup
}

/**
 * Подключает форму фильтра: по submit выбирает попытки и обновляет
 * счётчик и список без перезагрузки страницы.
 */
function startFilter() {
  const form = document.querySelector('#filter-form')
  const select = document.querySelector('#filter')
  const count = document.querySelector('#result-count')
  const list = document.querySelector('#result-list')

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const attempts = selectAttempts(select.value)
    const total = window.reportData.attempts.length
    count.textContent = `Показано: ${attempts.length} из ${total}`
    renderAttempts(attempts, list)
  })
}

startFilter()
