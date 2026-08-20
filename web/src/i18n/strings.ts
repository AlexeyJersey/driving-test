/**
 * Interface strings, deliberately apart from question content.
 *
 * Questions are always Montenegrin, in every interface language, because that is
 * the language of the real exam. The chrome is translatable; the content is not.
 * Montenegrin is the default chrome for the same reason: a learner reading it is
 * already reading the language they will be examined in.
 */

export type UiLanguage = 'me' | 'en' | 'ru'

export const UI_LANGUAGES: readonly UiLanguage[] = ['me', 'en', 'ru']
export const DEFAULT_UI_LANGUAGE: UiLanguage = 'me'

/** Short labels for the switcher; each written in its own language. */
export const LANGUAGE_LABELS: Record<UiLanguage, string> = {
  me: 'CG',
  en: 'EN',
  ru: 'RU',
}

export const LANGUAGE_NAMES: Record<UiLanguage, string> = {
  me: 'Crnogorski',
  en: 'English',
  ru: 'Русский',
}

/**
 * Montenegrin and Russian both need three forms and share the same selection
 * rule; getting it wrong reads as broken software rather than as a rough edge.
 */
function slavic(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

const english = (n: number, one: string, many: string): string => (n === 1 ? one : many)

export interface Strings {
  readonly appName: string
  readonly appTagline: string
  readonly language: { readonly label: string }
  readonly home: {
    readonly startStudy: string
    readonly resumeTitle: string
    readonly resumeBody: (done: number, total: number) => string
    readonly resume: string
    readonly discard: string
    readonly pickTopic: string
    readonly allTopics: string
    readonly shuffle: string
    readonly questionsAvailable: (n: number) => string
    readonly emptySelection: string
    readonly progressSummary: (attempted: number, total: number) => string
    readonly mistakesTitle: string
    readonly mistakesStart: string
    readonly mistakesEmpty: string
    readonly mistakesCount: (n: number) => string
  }
  readonly study: {
    readonly position: (current: number, total: number) => string
    readonly submit: string
    readonly next: string
    readonly finish: string
    readonly correct: string
    readonly wrong: string
    readonly disputedTitle: string
    readonly disputedBody: string
    readonly leave: string
  }
  readonly summary: {
    readonly title: string
    readonly score: (correct: number, total: number) => string
    readonly mistakes: (n: number) => string
    readonly perfect: string
    readonly again: string
    readonly home: string
  }
  readonly storage: {
    readonly unavailable: string
    readonly discarded: string
  }
  readonly categories: Readonly<Record<string, string>>
  readonly volumes: Readonly<Record<string, string>>
}

const me: Strings = {
  appName: 'Ispitni testovi',
  appTagline: 'Pitanja za vozački ispit',
  language: { label: 'Jezik' },
  home: {
    startStudy: 'Počni vježbanje',
    resumeTitle: 'Nezavršeno vježbanje',
    resumeBody: (done, total) => `Zastali ste na ${done} od ${total}`,
    resume: 'Nastavi',
    discard: 'Ispočetka',
    pickTopic: 'Šta ponavljamo',
    allTopics: 'Sve teme',
    shuffle: 'Izmiješaj pitanja',
    questionsAvailable: (n) => `${n} ${slavic(n, 'pitanje', 'pitanja', 'pitanja')}`,
    emptySelection: 'U izabranoj temi nema pitanja. Izaberite drugu ili uklonite filter.',
    progressSummary: (attempted, total) => `Pređeno ${attempted} od ${total}`,
    mistakesTitle: 'Rad na greškama',
    mistakesStart: 'Ponovi greške',
    mistakesEmpty: 'Nema grešaka za ponavljanje. Riješite nekoliko pitanja pa se vratite.',
    mistakesCount: (n) => `${n} ${slavic(n, 'greška', 'greške', 'grešaka')}`,
  },
  study: {
    position: (current, total) => `${current} / ${total}`,
    submit: 'Odgovori',
    next: 'Dalje',
    finish: 'Završi',
    correct: 'Tačno',
    wrong: 'Netačno',
    disputedTitle: 'Odgovor je sporan',
    disputedBody:
      'Oznaka na originalnom slajdu izgleda sumnjivo. Ne učite ovo pitanje napamet dok ne bude provjereno.',
    leave: 'Izađi',
  },
  summary: {
    title: 'Vježbanje završeno',
    score: (correct, total) => `${correct} od ${total} tačno`,
    mistakes: (n) => `${n} ${slavic(n, 'greška', 'greške', 'grešaka')}`,
    perfect: 'Bez grešaka',
    again: 'Još jednom',
    home: 'Na početnu',
  },
  storage: {
    unavailable: 'Napredak se ne čuva: pregledač ne dozvoljava pristup skladištu.',
    discarded: 'Sačuvani napredak nije bilo moguće pročitati i poništen je.',
  },
  categories: { vehicle: 'Poznavanje vozila', firstaid: 'Prva pomoć' },
  volumes: {
    I: 'Pravila saobraćaja',
    II: 'Situacije u saobraćaju',
    III: 'Znakovi i signali',
    IV: 'Vozilo i prva pomoć',
  },
}

const en: Strings = {
  appName: 'Ispitni testovi',
  appTagline: 'Montenegrin driving-test questions',
  language: { label: 'Language' },
  home: {
    startStudy: 'Start studying',
    resumeTitle: 'Unfinished session',
    resumeBody: (done, total) => `You stopped at ${done} of ${total}`,
    resume: 'Continue',
    discard: 'Start over',
    pickTopic: 'What to practise',
    allTopics: 'All topics',
    shuffle: 'Shuffle questions',
    questionsAvailable: (n) => `${n} ${english(n, 'question', 'questions')}`,
    emptySelection: 'No questions in this topic. Pick another or clear the filter.',
    progressSummary: (attempted, total) => `${attempted} of ${total} attempted`,
    mistakesTitle: 'Your mistakes',
    mistakesStart: 'Practise mistakes',
    mistakesEmpty: 'Nothing to practise yet. Answer a few questions and come back.',
    mistakesCount: (n) => `${n} ${english(n, 'mistake', 'mistakes')}`,
  },
  study: {
    position: (current, total) => `${current} / ${total}`,
    submit: 'Answer',
    next: 'Next',
    finish: 'Finish',
    correct: 'Correct',
    wrong: 'Wrong',
    disputedTitle: 'Disputed answer',
    disputedBody:
      'The mark on the source slide looks doubtful. Do not memorise this one until it has been verified.',
    leave: 'Leave',
  },
  summary: {
    title: 'Session finished',
    score: (correct, total) => `${correct} of ${total} correct`,
    mistakes: (n) => `${n} ${english(n, 'mistake', 'mistakes')}`,
    perfect: 'No mistakes',
    again: 'Again',
    home: 'Home',
  },
  storage: {
    unavailable: 'Progress is not being saved: the browser is blocking storage.',
    discarded: 'Saved progress could not be read and has been cleared.',
  },
  categories: { vehicle: 'Vehicle knowledge', firstaid: 'First aid' },
  volumes: {
    I: 'Traffic rules',
    II: 'Traffic situations',
    III: 'Signs and signals',
    IV: 'Vehicle and first aid',
  },
}

const ru: Strings = {
  appName: 'Ispitni testovi',
  appTagline: 'Билеты черногорской автошколы',
  language: { label: 'Язык' },
  home: {
    startStudy: 'Начать занятие',
    resumeTitle: 'Незаконченное занятие',
    resumeBody: (done, total) => `Вы остановились на ${done} из ${total}`,
    resume: 'Продолжить',
    discard: 'Начать заново',
    pickTopic: 'Что повторяем',
    allTopics: 'Все темы',
    shuffle: 'Перемешать вопросы',
    questionsAvailable: (n) => `${n} ${slavic(n, 'вопрос', 'вопроса', 'вопросов')}`,
    emptySelection: 'В выбранной теме нет вопросов. Выберите другую или снимите фильтр.',
    progressSummary: (attempted, total) => `Пройдено ${attempted} из ${total}`,
    mistakesTitle: 'Работа над ошибками',
    mistakesStart: 'Повторить ошибки',
    mistakesEmpty: 'Повторять пока нечего. Ответьте на несколько вопросов и возвращайтесь.',
    mistakesCount: (n) => `${n} ${slavic(n, 'ошибка', 'ошибки', 'ошибок')}`,
  },
  study: {
    position: (current, total) => `${current} / ${total}`,
    submit: 'Ответить',
    next: 'Дальше',
    finish: 'Завершить',
    correct: 'Верно',
    wrong: 'Неверно',
    disputedTitle: 'Ответ под вопросом',
    disputedBody:
      'Отметка на исходном слайде вызывает сомнения. Не заучивайте этот вопрос, пока он не проверен.',
    leave: 'Выйти',
  },
  summary: {
    title: 'Занятие завершено',
    score: (correct, total) => `${correct} из ${total} верно`,
    mistakes: (n) => `${n} ${slavic(n, 'ошибка', 'ошибки', 'ошибок')}`,
    perfect: 'Без ошибок',
    again: 'Ещё раз',
    home: 'На главную',
  },
  storage: {
    unavailable: 'Прогресс не сохраняется: браузер не даёт доступ к хранилищу.',
    discarded: 'Сохранённый прогресс не удалось прочитать, он был сброшен.',
  },
  categories: { vehicle: 'Устройство автомобиля', firstaid: 'Первая помощь' },
  volumes: {
    I: 'Правила движения',
    II: 'Ситуации на дороге',
    III: 'Знаки и сигналы',
    IV: 'Автомобиль и первая помощь',
  },
}

export const dictionaries: Record<UiLanguage, Strings> = { me, en, ru }

export function stringsFor(language: UiLanguage): Strings {
  return dictionaries[language]
}

/** Falls back to the raw key, so a new category shows up rather than vanishing. */
export function categoryLabel(strings: Strings, key: string): string {
  return strings.categories[key] ?? key
}

export function volumeLabel(strings: Strings, key: string, fallback: string): string {
  return strings.volumes[key] ?? fallback
}
