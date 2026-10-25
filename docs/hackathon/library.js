const views = [...document.querySelectorAll('article[data-doc]')];
const header = document.querySelector('.reader-header');
const checks = JSON.parse(document.getElementById('task-data').textContent);
const productionTasks = window.productionTasks;
const storageKey = 'lulu.review.completed-tasks.v1';
let overrides = {};
try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) overrides = saved; } catch {}
let active = '';
let activeGroup = 'documents';
function groupFor(id) { return id.startsWith('media-') ? 'media' : id.startsWith('tasks-') ? 'tasks' : 'documents'; }
function showSubheader(group) {
  document.querySelectorAll('[data-sub]').forEach(el => el.hidden = el.dataset.sub !== group);
}
function navigate() {
  const requested = decodeURIComponent(location.hash.slice(1)) || 'canvas';
  const target = requested === 'tasks-delivery' ? 'tasks-production' : requested;
  const view = views.find(el => el.id === target) || views.find(el => el.contains(document.getElementById(target))) || document.getElementById('canvas');
  views.forEach(el => el.hidden = el !== view);
  activeGroup = groupFor(view.id);
  showSubheader(activeGroup);
  document.querySelectorAll('[data-main]').forEach(link => {
    if (link.dataset.main === activeGroup) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('.subheader a').forEach(link => {
    if (link.hash === '#' + view.id) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  });
  document.title = 'LuLu — ' + view.querySelector('h1').textContent;
  if (active !== view.id) { active = view.id; window.scrollTo(0,0); }
  if (target !== view.id) document.getElementById(target)?.scrollIntoView();
}
document.querySelectorAll('[data-main]').forEach(link => {
  link.addEventListener('mouseenter', () => showSubheader(link.dataset.main));
  link.addEventListener('focus', () => showSubheader(link.dataset.main));
});
header.addEventListener('mouseleave', () => showSubheader(activeGroup));
header.addEventListener('focusout', e => { if (!header.contains(e.relatedTarget)) showSubheader(activeGroup); });
window.addEventListener('hashchange', navigate);
document.querySelector('.reader-print').addEventListener('click', () => window.print());
function isComplete(task) { return typeof overrides[task.id] === 'boolean' ? overrides[task.id] : task.done; }
function renderTasks() {
  const now = Date.now();
  for (const task of checks) {
    const done = isComplete(task);
    const row = document.querySelector('[data-task="'+task.id+'"]');
    row.classList.toggle('complete', done);
    row.querySelector('input').checked = done;
    const status = row.querySelector('[data-due]');
    const past = task.date && Date.parse(task.date) < now;
    status.textContent = done ? '✓ Done' : past ? 'Past scheduled time · not checked off' : task.date ? 'Pending' : '';
    status.className = done ? 'complete' : past ? 'late' : '';
  }
  for (const group of ['platform','internal']) {
    const items = checks.filter(t => t.group === group);
    const complete = items.filter(isComplete).length;
    const next = items.filter(t => !isComplete(t) && t.date && Date.parse(t.date) > now).sort((a,b) => Date.parse(a.date)-Date.parse(b.date))[0];
    const summary = document.querySelector('[data-summary="'+group+'"]');
    summary.textContent = complete+' of '+items.length+' checked off'+(next ? ' · Next: '+next.title+' — '+next.when : '');
  }
}
function renderProductionTasks() {
  const mount = document.getElementById('production-task-list');
  if (!mount || !productionTasks) return;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  mount.innerHTML = productionTasks.sections.map(section => `
    <section class="production-section" aria-labelledby="production-${escape(section.id)}">
      <header><h2 id="production-${escape(section.id)}">${escape(section.title)}</h2><p>${escape(section.summary)}</p></header>
      <div class="production-items">${section.tasks.map(task => `
        <article class="production-item">
          <div class="production-item-heading"><h3>${escape(task.title)}</h3><span>${escape(task.status)}</span></div>
          <p>${escape(task.detail)}</p><p class="production-next"><strong>Next:</strong> ${escape(task.next)}</p>
        </article>`).join('')}
      </div>
    </section>`).join('');
}
document.querySelectorAll('[data-check]').forEach(input => input.addEventListener('change', () => {
  overrides[input.dataset.check] = input.checked;
  try { localStorage.setItem(storageKey, JSON.stringify(overrides)); }
  catch { document.querySelectorAll('.task-note').forEach(el => el.textContent='This browser could not save checklist changes. They will last only for this page session.'); }
  renderTasks();
}));
renderTasks();
renderProductionTasks();
navigate();
