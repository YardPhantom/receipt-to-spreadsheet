// Client-side receipt → CSV heuristic. Text in, line items out. Nothing leaves the browser.
// Plug-in point: replace `extractText` with a document-vision LLM call later.
const SAMPLE = `GREEN VALLEY MARKET
123 Main St, Dawson Creek BC
10/27/2026 14:32
Organic Bananas 1.2kg      3.58
2 x Almond Milk 1L   @4.49   8.98
Sourdough Loaf             6.25
Free Range Eggs 12ct       7.99
Cheddar Block 400g         9.49
Coffee Beans 340g         14.99
SUBTOTAL                  51.28
GST 5%                     2.56
TOTAL                     53.84
VISA ****4242             53.84
THANK YOU!`;
const SKIP = /\b(subtotal|sub-total|total|tax|gst|hst|pst|vat|change|cash|visa|mastercard|amex|debit|balance|tender|thank|tip)\b/i;
function parse(text) {
  const items = [], meta = {};
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  meta.store = lines[0] || '';
  const d = text.match(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/); meta.date = d ? d[1] : '';
  for (const l of lines) {
    const m = l.match(/^(.*?)\s+\$?(-?\d{1,5}[.,]\d{2})\s*[A-Z]?$/);
    if (!m) continue;
    const amt = parseFloat(m[2].replace(',', '.'));
    if (/\btotal\b/i.test(l) && !/sub/i.test(l)) meta.total = amt;
    if (/subtotal|sub-total/i.test(l)) meta.subtotal = amt;
    if (/\b(tax|gst|hst|pst|vat)\b/i.test(l)) meta.tax = amt;
    if (SKIP.test(l)) continue;
    let desc = m[1].trim(), qty = 1, unit = amt;
    const q = desc.match(/^(\d+)\s*[x@*]\s*(.+)$/i); if (q) { qty = +q[1]; desc = q[2]; }
    const u = desc.match(/^(.*?)\s*@\s*\$?(\d+[.,]\d{2})$/); if (u) { desc = u[1]; unit = parseFloat(u[2].replace(',', '.')); } else unit = +(amt / qty).toFixed(2);
    if (desc.length < 2 || /^\d+$/.test(desc)) continue;
    items.push({ desc: desc.replace(/\s{2,}/g, ' '), qty, unit, amount: amt });
  }
  return { items, meta };
}
const csvCell = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
function toCSV(r) { return ['date,store,description,qty,unit_price,amount', ...r.items.map(i => [r.meta.date, r.meta.store, i.desc, i.qty, i.unit.toFixed(2), i.amount.toFixed(2)].map(csvCell).join(','))].join('\n'); }
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function render(r) {
  const sum = r.items.reduce((a, i) => a + i.amount, 0);
  const ok = r.meta.subtotal != null ? Math.abs(sum - r.meta.subtotal) < 0.02 : null;
  window._csv = toCSV(r);
  document.getElementById('out').innerHTML =
    `<div class="card"><h2>${esc(r.meta.store || 'Receipt')} ${r.meta.date ? '· ' + esc(r.meta.date) : ''}</h2>${r.items.length} line items · items sum <b>${sum.toFixed(2)}</b>` +
    (r.meta.subtotal != null ? ` · subtotal ${r.meta.subtotal.toFixed(2)} <span class="tag ${ok ? 'low' : 'high'}">${ok ? 'MATCH' : 'MISMATCH'}</span>` : '') +
    (r.meta.tax != null ? ` · tax ${r.meta.tax.toFixed(2)}` : '') + (r.meta.total != null ? ` · total <b>${r.meta.total.toFixed(2)}</b>` : '') + '</div>' +
    `<div class="card"><h2>Line items</h2><table><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Amount</th></tr>${r.items.map(i => `<tr><td>${esc(i.desc)}</td><td class="n">${i.qty}</td><td class="n">${i.unit.toFixed(2)}</td><td class="n">${i.amount.toFixed(2)}</td></tr>`).join('')}</table></div>` +
    `<div class="card"><h2>CSV</h2><pre style="white-space:pre-wrap;font-size:12px;margin:0">${esc(window._csv)}</pre></div>`;
}
async function extractText(file) {
  if (file.type.startsWith('text') || /\.(txt|csv)$/i.test(file.name)) return file.text();
  if (file.type === 'application/pdf') { // naive text-layer extraction from uncompressed PDF text operators
    const s = new TextDecoder('latin1').decode(await file.arrayBuffer());
    const parts = [...s.matchAll(/\(((?:\\.|[^\\)])*)\)\s*T[jJ]/g)].map(m => m[1]);
    if (parts.length) return parts.join('\n');
  }
  alert('Image/compressed-PDF OCR is not built in yet (vision LLM plug-in planned). Paste OCR text instead.'); return '';
}
const ta = document.getElementById('in');
document.getElementById('go').onclick = () => render(parse(ta.value));
document.getElementById('sample').onclick = () => { ta.value = SAMPLE; render(parse(SAMPLE)); };
document.getElementById('file').onchange = async e => { const f = e.target.files[0]; if (f) { ta.value = await extractText(f); render(parse(ta.value)); } };
document.getElementById('dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([window._csv || ''], { type: 'text/csv' })); a.download = 'receipt.csv'; a.click(); };
if (location.search.includes('demo')) document.getElementById('sample').click();
