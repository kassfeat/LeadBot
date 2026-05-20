import 'dotenv/config';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function formatBrief(data) {
  if (data._raw) return `🟢 Новый лид\n\n${data._raw}`;

  const lines = ['🟢 Новый лид', ''];

  const nameCompany = [data.name, data.company].filter(Boolean).join(' · ');
  if (nameCompany) lines.push(`👤 ${nameCompany}`);
  if (data.contact) lines.push(`📞 ${data.contact}`);

  const tasks = [];
  if (data.task) tasks.push(`📋 Задача: ${data.task}`);
  if (data.niche) tasks.push(`🏢 Ниша: ${data.niche}`);
  if (data.budget) tasks.push(`💰 Бюджет: ${data.budget}`);
  if (data.deadline) tasks.push(`📅 Сроки: ${data.deadline}`);
  if (tasks.length) {
    lines.push('');
    lines.push(...tasks);
  }

  if (data.verdict) {
    lines.push('');
    lines.push(`Вердикт: ${data.verdict}`);
  }

  if (data.extra) {
    lines.push('');
    lines.push(`ℹ️ Доп: ${data.extra}`);
  }

  return lines.join('\n');
}

function assertEnv() {
  if (!TOKEN || !CHAT_ID) throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');
}

export async function sendBrief(data) {
  assertEnv();
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: formatBrief(data),
      parse_mode: 'Markdown',
    }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function sendAttachments(files) {
  assertEnv();
  if (!files?.length) return;
  for (const f of files) {
    const isImage = f.mimetype?.startsWith('image/');
    const field = isImage ? 'photo' : 'document';
    const method = isImage ? 'sendPhoto' : 'sendDocument';

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append(field, new Blob([f.buffer], { type: f.mimetype }), f.name);

    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(`Telegram ${method} (${f.name}) ${res.status}: ${await res.text()}`);
  }
}
