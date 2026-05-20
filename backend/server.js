import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import * as sessions from './sessions.js';
import { chat, parseJSON } from './llm.js';
import { sendBrief, sendAttachments } from './telegram.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHAT_PROMPT = readFileSync(join(__dirname, 'prompts/chat.txt'), 'utf8');
const PARSER_PROMPT = readFileSync(join(__dirname, 'prompts/parser.txt'), 'utf8');

const DONE_MARKER = '[DONE]';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '256kb' }));

app.post('/chat', upload.array('files', 5), async (req, res) => {
  try {
    let { session_id, message } = req.body || {};
    const files = (req.files || []).map(f => ({
      name: f.originalname,
      mimetype: f.mimetype,
      buffer: f.buffer,
    }));

    if (!message && !files.length) {
      return res.status(400).json({ error: 'message or files required' });
    }

    if (!session_id || !sessions.get(session_id)) {
      session_id = sessions.create();
    }

    sessions.appendFiles(session_id, files);

    const userText = message?.trim()
      || `[Клиент прикрепил файлы: ${files.map(f => f.name).join(', ')}]`;
    sessions.append(session_id, 'user', userText);

    const s = sessions.get(session_id);
    let reply = await chat(CHAT_PROMPT, s.messages);
    const done = reply.includes(DONE_MARKER);
    if (done) reply = reply.replace(DONE_MARKER, '').trim();

    sessions.append(session_id, 'assistant', reply);
    res.json({ session_id, reply, done });
  } catch (e) {
    console.error('[/chat]', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/lead', async (req, res) => {
  try {
    const { session_id } = req.body || {};
    const s = sessions.get(session_id);
    if (!s) return res.status(404).json({ error: 'session not found' });

    const transcript = s.messages
      .map(m => `${m.role === 'user' ? 'Клиент' : 'Бот'}: ${m.content}`)
      .join('\n');

    const data = await parseJSON(PARSER_PROMPT, transcript);
    await sendBrief(data);
    await sendAttachments(s.files);

    sessions.drop(session_id);
    res.json({ ok: true });
  } catch (e) {
    console.error('[/lead]', e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`lead-bot backend on :${PORT}`));
