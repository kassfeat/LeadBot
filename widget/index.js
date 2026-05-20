(function () {
  const cfg = Object.assign(
    {
      apiUrl: 'http://localhost:3000',
      title: 'Адикт Маркетинг',
      placeholder: 'Напишите сообщение и нажмите Enter',
      greeting: 'Здравствуйте! Расскажите немного о вашей задаче.',
      accent: '#8BC34A',
      bubble: '#E8F5DC',
      botBubble: '#F0F0F0',
      avatar: '',
    },
    window.LEAD_BOT_CONFIG || {},
  );

  let sessionId = null;
  let leadSent = false;
  let pendingFiles = [];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function nowTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const style = document.createElement('style');
  style.textContent = `
    .lb-root { position: fixed; right: 20px; bottom: 20px; z-index: 999999;
      font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; }
    .lb-btn { width: 56px; height: 56px; border-radius: 50%; background: ${cfg.accent};
      color: #fff; border: none; box-shadow: 0 6px 20px rgba(0,0,0,.2);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: opacity 200ms ease, transform 200ms ease; }
    .lb-panel.open ~ .lb-btn { opacity: 0; transform: scale(0.6); pointer-events: none; }
    .lb-panel { position: absolute; right: 0; bottom: 0; width: 360px; height: 560px;
      background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,.18);
      display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(20px) scale(0.96); transform-origin: bottom right;
      pointer-events: none; visibility: hidden;
      transition: opacity 220ms ease, transform 220ms ease, visibility 0s linear 220ms; }
    .lb-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto;
      visibility: visible; transition: opacity 220ms ease, transform 220ms ease, visibility 0s; }
    .lb-head { padding: 16px 80px 14px 18px; font-weight: 600; color: #2c2c2c; font-size: 15px;
      border-bottom: 2px solid ${cfg.accent}; position: relative; }
    .lb-close { position: absolute; top: 0; right: 0; width: 64px; height: 50px;
      background: ${cfg.accent}; color: #fff; border: none; cursor: pointer;
      font-size: 22px; font-weight: bold; border-radius: 0 16px 0 30px; }
    .lb-body { flex: 1; padding: 16px; overflow-y: auto; background: #fff; }
    .lb-row { display: flex; gap: 10px; margin-bottom: 16px; align-items: flex-start; }
    .lb-row.user { justify-content: flex-end; }
    .lb-row.sys { justify-content: center; color: #999; font-size: 12px; }
    .lb-avatar-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px;
      flex-shrink: 0; width: 44px; }
    .lb-avatar { width: 40px; height: 40px; border-radius: 50%; background: ${cfg.accent};
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 16px; position: relative; }
    .lb-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .lb-time { font-size: 11px; color: #999; }
    .lb-bubble { max-width: 75%; padding: 12px 14px; border-radius: 14px;
      font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word;
      color: #222; }
    .lb-row.bot .lb-bubble { background: ${cfg.botBubble}; border-top-left-radius: 4px; }
    .lb-row.user .lb-bubble { background: ${cfg.bubble}; border-top-right-radius: 4px; }
    .lb-row.bot { animation: lb-msg-in 320ms cubic-bezier(.2,.7,.3,1) both; }
    @keyframes lb-msg-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .lb-typing-bubble { display: inline-flex !important; gap: 4px; align-items: center;
      padding: 14px 16px !important; min-width: auto; }
    .lb-dot { width: 7px; height: 7px; border-radius: 50%; background: #b0b0b0;
      animation: lb-blink 1.3s infinite ease-in-out; }
    .lb-dot:nth-child(2) { animation-delay: .2s; }
    .lb-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes lb-blink {
      0%, 80%, 100% { opacity: .3; transform: scale(.8); }
      40% { opacity: 1; transform: scale(1); }
    }
    .lb-attachments { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 8px; }
    .lb-attachments:empty { display: none; }
    .lb-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
      background: ${cfg.bubble}; color: #3b5a16; border-radius: 14px; font-size: 12px; max-width: 220px; }
    .lb-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lb-chip-x { border: none; background: transparent; color: #3b5a16; cursor: pointer;
      font-size: 14px; line-height: 1; padding: 0; }
    .lb-form { border-top: 1px solid #eee; padding: 12px 16px 14px; }
    .lb-input { width: 100%; border: none; padding: 8px 0; font-size: 14px; outline: none;
      background: transparent; color: #222; font-family: inherit; line-height: 1.4;
      resize: none; max-height: 120px; overflow-y: auto; display: block; }
    .lb-input::placeholder { color: #b0b0b0; }
    .lb-controls { display: flex; justify-content: space-between; align-items: center; padding-top: 6px; }
    .lb-attach { width: 36px; height: 36px; border-radius: 50%; border: 2px solid ${cfg.accent};
      background: transparent; cursor: pointer; color: ${cfg.accent}; font-size: 16px;
      display: flex; align-items: center; justify-content: center; }
    .lb-send { width: 40px; height: 40px; border-radius: 50%; border: none;
      background: #222; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center; padding: 0; }
    .lb-send svg { margin-left: 2px; }
    .lb-send:disabled { opacity: .5; cursor: default; }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'lb-root';
  root.innerHTML = `
    <div class="lb-panel" id="lb-panel">
      <div class="lb-head">
        ${escapeHtml(cfg.title)}
        <button class="lb-close" id="lb-close" aria-label="Закрыть">×</button>
      </div>
      <div class="lb-body" id="lb-body"></div>
      <div class="lb-attachments" id="lb-attachments"></div>
      <form class="lb-form" id="lb-form">
        <textarea class="lb-input" id="lb-input" placeholder="${escapeHtml(cfg.placeholder)}" autocomplete="off" rows="1"></textarea>
        <div class="lb-controls">
          <button class="lb-attach" id="lb-attach" type="button" aria-label="Прикрепить файл">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
          <input id="lb-file" type="file" multiple hidden />
          <button class="lb-send" id="lb-send" type="submit" aria-label="Отправить">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true"><path d="M1.5 1L11 7L1.5 13Z"/></svg>
          </button>
        </div>
      </form>
    </div>
    <button class="lb-btn" id="lb-btn" aria-label="Открыть чат">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('#lb-panel');
  const bodyEl = root.querySelector('#lb-body');
  const form = root.querySelector('#lb-form');
  const input = root.querySelector('#lb-input');
  const send = root.querySelector('#lb-send');
  const attachBtn = root.querySelector('#lb-attach');
  const fileInput = root.querySelector('#lb-file');
  const chipsEl = root.querySelector('#lb-attachments');

  root.querySelector('#lb-btn').onclick = () => {
    panel.classList.add('open');
    if (!bodyEl.children.length) addMsg('bot', cfg.greeting);
    input.focus();
  };
  root.querySelector('#lb-close').onclick = () => panel.classList.remove('open');

  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open')) return;
    if (root.contains(e.target)) return;
    panel.classList.remove('open');
  });

  function avatarHtml() {
    if (cfg.avatar) {
      return `<div class="lb-avatar"><img src="${escapeHtml(cfg.avatar)}" alt="" /></div>`;
    }
    const letter = (cfg.title || 'A').trim().charAt(0).toUpperCase();
    return `<div class="lb-avatar"><span>${escapeHtml(letter)}</span></div>`;
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'lb-row bot';
    row.innerHTML = `
      <div class="lb-avatar-wrap">
        ${avatarHtml()}
        <div class="lb-time">${nowTime()}</div>
      </div>
      <div class="lb-bubble lb-typing-bubble">
        <span class="lb-dot"></span><span class="lb-dot"></span><span class="lb-dot"></span>
      </div>
    `;
    bodyEl.appendChild(row);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return row;
  }

  function addMsg(kind, text) {
    const row = document.createElement('div');
    row.className = `lb-row ${kind}`;
    if (kind === 'bot') {
      row.innerHTML = `
        <div class="lb-avatar-wrap">
          ${avatarHtml()}
          <div class="lb-time">${nowTime()}</div>
        </div>
        <div class="lb-bubble"></div>
      `;
      row.querySelector('.lb-bubble').textContent = text;
    } else if (kind === 'sys') {
      row.textContent = text;
    } else {
      row.innerHTML = '<div class="lb-bubble"></div>';
      row.querySelector('.lb-bubble').textContent = text;
    }
    bodyEl.appendChild(row);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function renderChips() {
    chipsEl.innerHTML = '';
    pendingFiles.forEach((f, i) => {
      const chip = document.createElement('span');
      chip.className = 'lb-chip';
      chip.innerHTML = `<span class="lb-chip-name">📄 ${escapeHtml(f.name)}</span><button class="lb-chip-x" type="button" aria-label="Убрать">×</button>`;
      chip.querySelector('.lb-chip-x').onclick = () => {
        pendingFiles.splice(i, 1);
        renderChips();
      };
      chipsEl.appendChild(chip);
    });
  }

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  attachBtn.onclick = () => fileInput.click();
  fileInput.onchange = e => {
    for (const f of e.target.files) pendingFiles.push(f);
    if (pendingFiles.length > 5) pendingFiles = pendingFiles.slice(0, 5);
    renderChips();
    fileInput.value = '';
  };

  async function postChat(message) {
    const fd = new FormData();
    if (sessionId) fd.append('session_id', sessionId);
    fd.append('message', message);
    for (const f of pendingFiles) fd.append('files', f);
    const r = await fetch(`${cfg.apiUrl}/chat`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error(`chat ${r.status}`);
    return r.json();
  }

  async function postLead() {
    const r = await fetch(`${cfg.apiUrl}/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (!r.ok) throw new Error(`lead ${r.status}`);
    return r.json();
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text && !pendingFiles.length) return;
    if (send.disabled) return;

    const visibleText = text
      || (pendingFiles.length === 1
        ? `📎 ${pendingFiles[0].name}`
        : `📎 ${pendingFiles.length} файла(ов)`);
    addMsg('user', visibleText);
    input.value = '';
    input.style.height = 'auto';
    const filesSnapshot = pendingFiles.slice();
    pendingFiles = [];
    renderChips();
    send.disabled = true;

    let typingRow = showTyping();

    try {
      const { session_id, reply, done } = await postChat(text);
      sessionId = session_id;
      typingRow.remove();
      typingRow = null;
      if (reply) addMsg('bot', reply);

      if (done && !leadSent) {
        leadSent = true;
        try {
          await postLead();
          addMsg('sys', 'Заявка отправлена менеджеру ✓');
        } catch (err) {
          addMsg('sys', 'Не удалось отправить заявку');
          console.error(err);
        }
      }
    } catch (err) {
      addMsg('sys', 'Ошибка соединения');
      pendingFiles = filesSnapshot;
      renderChips();
      console.error(err);
    } finally {
      if (typingRow) typingRow.remove();
      send.disabled = false;
      input.focus();
    }
  };
})();
