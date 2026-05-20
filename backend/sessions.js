const sessions = new Map();

export function create() {
  const id = crypto.randomUUID();
  sessions.set(id, { messages: [], files: [], createdAt: Date.now() });
  return id;
}

export function get(id) {
  return sessions.get(id);
}

export function append(id, role, content) {
  const s = sessions.get(id);
  if (!s) return null;
  s.messages.push({ role, content });
  return s;
}

export function appendFiles(id, files) {
  const s = sessions.get(id);
  if (!s || !files?.length) return s;
  for (const f of files) s.files.push(f);
  return s;
}

export function drop(id) {
  sessions.delete(id);
}
