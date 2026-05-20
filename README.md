# lead-bot

Бот для маркетингового агентства: виджет на сайте -> диалог с клиентом -> бриф менеджеру в Telegram.

## Структура

```
lead-bot/
├── widget/
│   ├── index.js            # виджет одним файлом, встраивается на сайт
│   └── demo.html           # локальная демо-страница
└── backend/
    ├── server.js           # express, два роута: /chat, /lead
    ├── llm.js              # вызов Anthropic (claude-haiku-4-5)
    ├── sessions.js         # хранилище сессий (Map в памяти)
    ├── telegram.js         # отправка брифа и вложений в Telegram
    ├── prompts/
    │   ├── chat.txt        # промпт диалога
    │   └── parser.txt      # промпт парсинга в JSON
    ├── .env                # ключи
    └── package.json
```

## Запуск

```bash
cd backend
npm install
# необходимо предварительно заполнить backend/.env
npm start
```

В `.env`:
- `ANTHROPIC_API_KEY` — ключ Anthropic Console (модель `claude-haiku-4-5`)
- `TELEGRAM_BOT_TOKEN` — токен бота от @BotFather
- `TELEGRAM_CHAT_ID` — id чата/канала менеджера
- `PORT` — порт бэка (по умолчанию 3000)

## Виджет на сайте

```html
<script>
  window.LEAD_BOT_CONFIG = { apiUrl: 'https://your-backend.example.com' };
</script>
<script src="https://your-cdn.example.com/widget/index.js"></script>
```

## Поток

1. Клиент пишет в виджет (можно прикреплять до 5 файлов, по 10MB) → `POST /chat` (multipart: `session_id?`, `message`, `files[]`)
2. Сервер прокидывает историю в Claude с `prompts/chat.txt`; файлы буферизуются в сессии (LLM их не видит)
3. Когда LLM считает диалог завершённым, в ответе появляется маркер `[DONE]` → `done: true`
4. Виджет вызывает `POST /lead { session_id }`
5. Сервер парсит транскрипт в JSON через `prompts/parser.txt`, шлёт бриф и приложенные файлы в Telegram
