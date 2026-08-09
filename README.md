# React Rerender Counter

Расширение для браузера (Chrome/Firefox), которое считает и анализирует ре-рендеры React компонентов в реальном времени.

## Стек технологий

| Инструмент | Версия | Назначение |
|------------|--------|------------|
| TypeScript | ^7.0.2 | Типобезопасность |
| esbuild | 0.28.2 | Сборка и бандлинг |
| Biome | ^2.5.7 | Линтер и форматирование |
| Chrome Extensions API | Manifest V3 | Платформа расширений |
| React DevTools Hook | — | Доступ к fiber tree |

## Структура проекта

```
render-counter/
├── src/
│   ├── inject.ts           # MAIN world — хук React fiber
│   ├── content.ts          # ISOLATED world — мост inject ↔ background
│   ├── background.ts       # Service worker — состояние, badge, сообщения
│   ├── devtools.ts         # DevTools context — создание панели
│   ├── devtools.html       # Точка входа DevTools
│   └── panel.html          # UI панели в DevTools
├── icons/
│   ├── icon-48.png
│   └── icon-128.png
├── dist/                   # Собранные файлы (грузим в Chrome)
├── .vscode/
│   ├── settings.json       # Форматирование при сохранении
│   └── extensions.json     # Рекомендация Biome
├── biome.json              # Конфиг линтера и форматтера
├── tsconfig.json           # Конфиг TypeScript (только проверка типов)
├── esbuild.config.mjs      # Скрипт сборки
├── manifest.json           # Манифест расширения
├── package.json
└── README.md
```

## Архитектура

```
┌─────────────┐   CustomEvent    ┌────────────┐  chrome.runtime  ┌──────────────┐
│  inject.ts  │ ──────────────→ │ content.ts │ ←──────────────→ │ background.ts│
│ (MAIN world)│                 │(ISOLATED)  │                  │(service work)│
└─────────────┘                 └────────────┘                  └──────┬───────┘
                                                                     │
                                                     ┌───────────────┼───────────┐
                                                     ↓               ↓           ↓
                                                   badge        devtools.ts   panel.html
```

### Как работает

1. **inject.ts** запускается на `document_start` в MAIN world (контекст страницы)
   - Создаёт `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` если его нет
   - Когда React загружается — вызывает `hook.inject(renderer)` → отправляет событие `REACT_DETECTED`
   - Подписывается на `onCommitFiberRoot` для получения обновлений fiber tree

2. **content.ts** связывает MAIN ↔ Extension
   - Слушает `CustomEvent` `REACT_DETECTED` от inject.ts
   - Пересылает в background.ts через `chrome.runtime.sendMessage`

3. **background.ts** управляет состоянием
   - Хранит статус обнаружения React по каждой вкладке
   - Обновляет badge (синяя "R" когда React найден)
   - Отвечает на запросы `GET_REACT_STATE` от devtools.ts

4. **devtools.ts** создаёт панель
   - Спрашивает background: "есть ли React на вкладке?"
   - Если да → создаёт панель "React Rerenders" в DevTools

## Разработка

### Требования

- Node.js 18+
- Google Chrome или Firefox 128+

### Установка

```bash
npm install
```

### Команды

| Команда | Описание |
|---------|----------|
| `npm run build` | Собрать в `dist/` |
| `npm run watch` | Режим отслеживания (пересборка при изменениях) |
| `npm run typecheck` | Проверка типов через tsc |
| `npm run lint` | Проверка через Biome |
| `npm run lint:fix` | Автоисправление ошибок |
| `npm run format` | Форматирование всех файлов |

### Загрузка в Chrome

1. `npm run build`
2. Открыть `chrome://extensions`
3. Включить "Режим разработчика"
4. Нажать "Загрузить распакованное расширение" → выбрать папку `dist/`
5. Открыть любую React-страницу → F12 → Консоль → видим логи `COMMIT!`

### Настройка IDE

VS Code с расширением Biome (автоматически через `.vscode/extensions.json`):
- Форматирование при сохранении
- Автоисправление при сохранении
- Сортировка импортов при сохранении

## Задачи

### ✅ Готово

- [x] Настройка проекта (TypeScript, esbuild, Biome)
- [x] Конфигурация VS Code (форматирование при сохранении, линтер)
- [x] `inject.ts` — создание хука React DevTools, событие `REACT_DETECTED`
- [x] `content.ts` — мост между inject и background
- [x] `background.ts` — управление состоянием вкладок, окраска badge
- [x] `devtools.ts` + `devtools.html` — условное создание панели
- [x] `panel.html` — заглушка UI панели
- [x] `manifest.json` — манифест Chrome MV3

### 🔄 В работе

- [ ] `manifest.json` — добавить background, devtools_page, content.js записи
- [ ] `inject.ts` — реализовать обход fiber tree и подсчёт ре-рендеров
- [ ] `content.ts` — пересылка данных о рендерах в background

### 📋 Запланировано

- [ ] **Подсчёт ре-рендеров** — обход fiber tree, классификация триггеров (state/props/context/parent)
- [ ] **Состояние в background** — хранение статистики по каждому компоненту
- [ ] **Popup UI** — топ-10 компонентов, счётчик ре-рендеров, кнопка сброса
- [ ] **DevTools Panel** — полная таблица: имя | ре-рендеры | среднее время | время компонента | триггер
- [ ] **React Scan overlay** — визуальная подсветка ре-рендерящихся компонентов на странице
- [ ] **Badge со счётчиком** — показ общего количества ре-рендеров на иконке
- [ ] **Поддержка Firefox** — отдельный манифест для Firefox

## Ключевые концепции

### React Fiber

Внутренняя структура данных React. Каждый компонент — это `FiberNode` со свойствами:
- `type` — функция/класс компонента
- `child`, `sibling`, `return` — структура дерева
- `alternate` — предыдущий коммит (для diff)
- `memoizedProps`, `memoizedState` — текущие значения
- `actualDuration` — время рендера

### `__REACT_DEVTOOLS_GLOBAL_HOOK__`

React проверяет этот хук при старте. Если находит — вызывает `hook.inject(renderer)` для регистрации. Затем при каждом коммите вызывает `hook.onCommitFiberRoot(rendererId, root)`. Наше расширение подписывается на это чтобы получать все обновления fiber tree.

### MAIN vs ISOLATED World

| Мир | Доступ | Используется |
|-----|--------|--------------|
| MAIN | Контекст JS страницы, React internals | `inject.ts` |
| ISOLATED | Только DOM, API `chrome.runtime` | `content.ts` |

Связь между мирами через `CustomEvent` на `window`.
