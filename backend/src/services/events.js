// Server-Sent Events hub: pushes live PC / complaint / notification updates to browsers.
const clients = new Map(); // id -> { res, userId, role }
let seq = 0;

function addClient(res, user) {
  const id = ++seq;
  clients.set(id, { res, userId: user ? String(user._id) : null, role: user ? user.role : null });
  return id;
}
const removeClient = (id) => clients.delete(id);

// target: { userIds: [], roles: [] }  -> only those users get it. No target -> everyone (public data like PC colours)
function emit(event, data = {}, target) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, c] of clients) {
    if (target) {
      const ids = (target.userIds || []).filter(Boolean).map(String);
      const ok = (c.userId && ids.includes(c.userId)) || (c.role && (target.roles || []).includes(c.role));
      if (!ok) continue;
    }
    try {
      c.res.write(payload);
    } catch {
      clients.delete(id);
    }
  }
}

setInterval(() => {
  for (const [id, c] of clients) {
    try {
      c.res.write(': ping\n\n');
    } catch {
      clients.delete(id);
    }
  }
}, 25000).unref();

module.exports = { addClient, removeClient, emit };
