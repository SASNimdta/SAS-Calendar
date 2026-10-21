'use strict';

const EVENT_TYPES = {
  'generic capabilities': { label: 'Generic Capabilities', colour: '#18cf32' },
  'course': { label: 'Course', colour: '#ef8bdb' },
  'other event': { label: 'Other Event', colour: '#202d35' },
  'qi course': { label: 'QI Course', colour: '#6dc9ea' },
  'portfolio pathway': { label: 'Portfolio Pathway', colour: '#f5b941' },
  'development fund': { label: 'Development Fund', colour: '#f47d61' }
};

const STATUSES = {
  'coming soon': { label: 'Coming Soon', colour: '#f6ef8c' },
  'open for booking': { label: 'Open for Booking', colour: '#b9ef73' },
  'fully booked': { label: 'Fully Booked', colour: '#ff743d' },
  'date to be confirmed': { label: 'Date to be confirmed', colour: '#e8a7d8' }
};

const FORMATS = {
  'face to face': { label: 'Face to Face', icon: '♧' },
  'virtual': { label: 'Virtual', icon: '▣' },
  'flagship': { label: 'Flagship', icon: '⚑' },
  'deadline': { label: 'Deadline', icon: '◴' },
  'celebration': { label: 'Celebration', icon: '⌁' }
};

const state = {
  events: [],
  visibleMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  lastFocusedElement: null
};

const elements = {
  calendar: document.querySelector('#calendar'),
  monthTitle: document.querySelector('#monthTitle'),
  loadMessage: document.querySelector('#loadMessage'),
  upcomingEvents: document.querySelector('#upcomingEvents'),
  eventTypeLegend: document.querySelector('#eventTypeLegend'),
  statusLegend: document.querySelector('#statusLegend'),
  formatLegend: document.querySelector('#formatLegend'),
  modalBackdrop: document.querySelector('#modalBackdrop'),
  modalHeader: document.querySelector('#modalHeader'),
  modalTitle: document.querySelector('#modalTitle'),
  modalFormatIcon: document.querySelector('#modalFormatIcon'),
  modalBody: document.querySelector('#modalBody'),
  closeModal: document.querySelector('#closeModal')
};

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some(cell => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some(cell => cell.trim() !== '')) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(header => normalise(header.replace(/^\uFEFF/, '')));
  return rows.slice(1).map((cells, rowIndex) => {
    const record = { _row: rowIndex + 2 };
    headers.forEach((header, columnIndex) => { record[header] = (cells[columnIndex] || '').trim(); });
    return record;
  });
}

function parseUkDate(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function isPublished(value) {
  return ['yes', 'y', 'true', '1', 'x'].includes(normalise(value));
}

function getField(record, ...names) {
  for (const name of names) {
    if (record[name] !== undefined) return record[name];
  }
  return '';
}

function mapRecord(record) {
  const dateText = getField(record, 'date');
  return {
    name: getField(record, 'event name', 'name of event'),
    dateText,
    date: parseUkDate(dateText),
    eventType: getField(record, 'event type', 'type of event'),
    duration: getField(record, 'duration'),
    time: getField(record, 'time'),
    venue: getField(record, 'venue details', 'venue'),
    status: getField(record, 'status'),
    format: getField(record, 'format', 'type'),
    publish: getField(record, 'publish'),
    row: record._row
  };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function eventTypeDetails(value) {
  return EVENT_TYPES[normalise(value)] || { label: value || 'Other Event', colour: '#51626b' };
}
function statusDetails(value) {
  return STATUSES[normalise(value)] || { label: value, colour: '#9aa3a8' };
}
function formatDetails(value) {
  return FORMATS[normalise(value)] || { label: value, icon: '•' };
}

function sameDay(first, second) {
  return first && second && first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

function renderLegends() {
  elements.eventTypeLegend.innerHTML = Object.values(EVENT_TYPES).map(item =>
    `<span class="type-tag" style="background:${item.colour}">${escapeHtml(item.label)}</span>`
  ).join('');

  elements.statusLegend.innerHTML = Object.values(STATUSES).map(item =>
    `<div class="legend-row"><span class="legend-dot" style="background:${item.colour}"></span><span>${escapeHtml(item.label)}</span></div>`
  ).join('');

  elements.formatLegend.innerHTML = Object.values(FORMATS).map(item =>
    `<div class="legend-row"><span class="legend-icon" aria-hidden="true">${item.icon}</span><span>${escapeHtml(item.label)}</span></div>`
  ).join('');
}

function renderCalendar() {
  const year = state.visibleMonth.getFullYear();
  const month = state.visibleMonth.getMonth();
  elements.monthTitle.textContent = state.visibleMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let html = weekdays.map(day => `<div class="weekday" role="columnheader">${day}</div>`).join('');

  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const outside = date.getMonth() !== month;
    const weekdayIndex = index % 7;
    const weekend = weekdayIndex >= 5;
    const events = state.events.filter(event => sameDay(event.date, date));
    const cards = events.map(event => {
      const type = eventTypeDetails(event.eventType);
      const status = event.status ? statusDetails(event.status) : null;
      const format = event.format ? formatDetails(event.format) : null;
      const eventIndex = state.events.indexOf(event);
      return `<button type="button" class="event-card" data-event-index="${eventIndex}" style="background:${type.colour}" aria-label="Open details for ${escapeHtml(event.name)}">
        <span class="event-name">${escapeHtml(event.name)}</span>
        <span class="event-card-footer">${format ? `<span class="format-icon" aria-hidden="true">${format.icon}</span>` : ''}</span>
        ${status ? `<span class="status-dot" style="background:${status.colour}" title="${escapeHtml(status.label)}"></span>` : ''}
      </button>`;
    }).join('');

    html += `<div class="day-cell${weekend ? ' weekend' : ''}${outside ? ' outside-month' : ''}" role="gridcell" data-date="${date.toISOString().slice(0, 10)}">
      <span class="day-number${sameDay(date, today) ? ' today' : ''}">${date.getDate()}</span>
      <div class="event-stack">${cards}</div>
    </div>`;
  }

  elements.calendar.setAttribute('role', 'grid');
  elements.calendar.innerHTML = html;
  elements.calendar.querySelectorAll('.event-card').forEach(button => {
    button.addEventListener('click', () => openModal(state.events[Number(button.dataset.eventIndex)], button));
  });
}

function renderUpcoming() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 28);

  const upcoming = state.events
    .filter(event => event.date >= today && event.date <= end)
    .sort((a, b) => a.date - b.date || a.time.localeCompare(b.time))
    .slice(0, 6);

  if (!upcoming.length) {
    elements.upcomingEvents.innerHTML = '<p class="no-upcoming">No upcoming events in the next four weeks.</p>';
    return;
  }

  elements.upcomingEvents.innerHTML = upcoming.map(event => {
    const type = eventTypeDetails(event.eventType);
    const format = event.format ? formatDetails(event.format) : null;
    const eventIndex = state.events.indexOf(event);
    return `<button type="button" class="upcoming-card" data-event-index="${eventIndex}" style="background:${type.colour}">
      <strong>${format ? `<span aria-hidden="true">${format.icon}</span> ` : ''}${escapeHtml(event.name)}</strong>
      <time datetime="${event.date.toISOString().slice(0, 10)}">${escapeHtml(event.dateText)}</time>
    </button>`;
  }).join('');

  elements.upcomingEvents.querySelectorAll('.upcoming-card').forEach(button => {
    button.addEventListener('click', () => openModal(state.events[Number(button.dataset.eventIndex)], button));
  });
}

function openModal(event, trigger) {
  state.lastFocusedElement = trigger;
  const type = eventTypeDetails(event.eventType);
  const status = event.status ? statusDetails(event.status) : null;
  const format = event.format ? formatDetails(event.format) : null;
  elements.modalHeader.style.background = type.colour;
  elements.modalTitle.textContent = event.name;
  elements.modalFormatIcon.textContent = format ? format.icon : '';

  const dateDetails = [
    `<p>${escapeHtml(event.dateText)}</p>`,
    event.time ? `<p class="secondary">${escapeHtml(event.time)}</p>` : '',
    event.duration ? `<p class="secondary">${escapeHtml(event.duration)}</p>` : ''
  ].filter(Boolean).join('');

  elements.modalBody.innerHTML = `
    ${status ? `<div class="modal-status"><span class="legend-dot" style="background:${status.colour}"></span><span class="status-pill" style="background:${status.colour};color:${normalise(event.status) === 'coming soon' ? '#35434a' : '#fff'}">${escapeHtml(status.label)}</span></div>` : ''}
    <div class="detail-row"><span class="detail-icon" aria-hidden="true">◷</span><div class="detail-lines">${dateDetails}</div></div>
    ${event.venue ? `<div class="detail-row"><span class="detail-icon" aria-hidden="true">⌖</span><div class="detail-lines"><p>${escapeHtml(event.venue)}</p></div></div>` : ''}
    ${(event.eventType || event.format) ? '<hr class="modal-divider">' : ''}
    <dl>
      ${event.eventType ? `<div class="detail-meta"><dt>Event type:</dt><dd><span class="detail-pill" style="background:${type.colour}">${escapeHtml(type.label)}</span></dd></div>` : ''}
      ${event.format ? `<div class="detail-meta"><dt>Format:</dt><dd><span class="detail-pill format-pill">${escapeHtml(format.label)}</span></dd></div>` : ''}
    </dl>`;

  elements.modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  elements.closeModal.focus();
}

function closeModal() {
  elements.modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  if (state.lastFocusedElement) state.lastFocusedElement.focus();
}

async function loadEvents() {
  try {
    const response = await fetch('events.csv', { cache: 'no-store' });
    if (!response.ok) throw new Error(`events.csv returned ${response.status}`);
    const records = parseCsv(await response.text());
    const mapped = records.map(mapRecord);
    const invalid = mapped.filter(event => isPublished(event.publish) && (!event.name || !event.date));
    state.events = mapped
      .filter(event => isPublished(event.publish) && event.name && event.date)
      .sort((a, b) => a.date - b.date || a.name.localeCompare(b.name));

    elements.loadMessage.textContent = invalid.length
      ? `${invalid.length} published row${invalid.length === 1 ? '' : 's'} could not be shown because the event name or date is invalid.`
      : '';
  } catch (error) {
    console.error(error);
    elements.loadMessage.textContent = 'The events table could not be loaded. Open this project with Live Preview rather than opening index.html directly.';
    state.events = [];
  }
  renderCalendar();
  renderUpcoming();
}

document.querySelector('#previousMonth').addEventListener('click', () => {
  state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});
document.querySelector('#nextMonth').addEventListener('click', () => {
  state.visibleMonth = new Date(state.visibleMonth.getFullYear(), state.visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});
document.querySelector('#todayButton').addEventListener('click', () => {
  const today = new Date();
  state.visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
});
elements.closeModal.addEventListener('click', closeModal);
elements.modalBackdrop.addEventListener('click', event => {
  if (event.target === elements.modalBackdrop) closeModal();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !elements.modalBackdrop.hidden) closeModal();
});

renderLegends();
loadEvents();
