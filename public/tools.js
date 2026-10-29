// Shared toolbar: theme toggle (localStorage), Copy / Download primary output, Share ?demo=1 link.
(function () {
  const cfg = document.currentScript.dataset; // data-var, data-file, data-mime, data-label
  const root = document.documentElement, KEY = 'theme';
  const apply = t => { root.dataset.theme = t; const b = document.getElementById('theme'); if (b) b.textContent = t === 'light' ? '🌙 Dark' : '☀️ Light'; };
  apply(localStorage.getItem(KEY) || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  const bar = document.createElement('div'); bar.className = 'toolbar';
  const btn = (id, text, fn) => { const b = document.createElement('button'); b.id = id; b.className = 'alt'; b.textContent = text; b.onclick = fn; bar.appendChild(b); return b; };
  const out = () => window[cfg.var] || '';
  const flash = (b, msg) => { const t = b.textContent; b.textContent = msg; setTimeout(() => (b.textContent = t), 1200); };
  const copyText = async (s, b, ok) => { try { await navigator.clipboard.writeText(s); flash(b, ok); } catch { prompt('Copy this:', s); } };
  btn('copy', 'Copy ' + cfg.label, e => out() ? copyText(out(), e.target, 'Copied!') : flash(e.target, 'Nothing yet'));
  btn('dl', 'Download ' + cfg.label, e => {
    if (!out()) return flash(e.target, 'Nothing yet');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out()], { type: cfg.mime })); a.download = cfg.file; a.click(); URL.revokeObjectURL(a.href);
  });
  btn('share', '🔗 Share demo', e => copyText(location.origin + location.pathname + '?demo=1', e.target, 'Link copied!'));
  btn('theme', '', () => { const t = root.dataset.theme === 'light' ? 'dark' : 'light'; localStorage.setItem(KEY, t); apply(t); });
  document.querySelector('header').appendChild(bar); apply(root.dataset.theme);
})();
