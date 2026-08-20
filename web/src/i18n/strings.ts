/**
 * Interface strings, deliberately apart from question content.
 *
 * Questions stay in Montenegrin because that is the language of the real exam.
 * The chrome around them is Russian because that is the language of the person
 * studying. Keeping the two separate is what makes either one translatable
 * without touching the other.
 */
export const ui = {
  appName: 'Ispitni testovi',
  appTagline: 'Билеты черногорской автошколы',

  home: {
    startStudy: 'Начать занятие',
    resumeTitle: 'Незаконченное занятие',
    resumeBody: (done: number, total: number) => `Вы остановились на ${done} из ${total}`,
    resume: 'Продолжить',
    discard: 'Начать заново',
    pickTopic: 'Что повторяем',
    allTopics: 'Все темы',
    questionsAvailable: (n: number) => `${n} ${plural(n, 'вопрос', 'вопроса', 'вопросов')}`,
    emptySelection: 'В выбранной теме нет вопросов. Выберите другую или снимите фильтр.',
    progressSummary: (attempted: number, total: number) =>
      `Пройдено ${attempted} из ${total}`,
  },

  study: {
    position: (current: number, total: number) => `${current} / ${total}`,
    submit: 'Ответить',
    next: 'Дальше',
    finish: 'Завершить',
    correct: 'Верно',
    wrong: 'Неверно',
    correctAnswerIs: 'Правильный ответ',
    disputedTitle: 'Ответ под вопросом',
    disputedBody:
      'Отметка на исходном слайде вызывает сомнения. Не заучивайте этот вопрос, пока он не проверен.',
    bookmark: 'В закладки',
    bookmarked: 'В закладках',
    leave: 'Выйти',
  },

  summary: {
    title: 'Занятие завершено',
    score: (correct: number, total: number) => `${correct} из ${total} верно`,
    mistakes: (n: number) => `${n} ${plural(n, 'ошибка', 'ошибки', 'ошибок')}`,
    perfect: 'Без ошибок',
    again: 'Ещё раз',
    home: 'На главную',
  },

  storage: {
    unavailable: 'Прогресс не сохраняется: браузер не даёт доступ к хранилищу.',
    discarded: 'Сохранённый прогресс не удалось прочитать, он был сброшен.',
  },

  categories: {
    vehicle: 'Устройство автомобиля',
    firstaid: 'Первая помощь',
  } as Record<string, string>,

  volumes: {
    I: 'Правила движения',
    II: 'Ситуации на дороге',
    III: 'Знаки и сигналы',
    IV: 'Автомобиль и первая помощь',
  } as Record<string, string>,
} as const

/** Russian needs three plural forms, and getting it wrong reads as broken. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

/** Falls back to the raw key, so a new category shows up rather than vanishing. */
export function categoryLabel(key: string): string {
  return ui.categories[key] ?? key
}

export function volumeLabel(key: string, fallback: string): string {
  return ui.volumes[key] ?? fallback
}
