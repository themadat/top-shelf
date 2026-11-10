(function () {
  'use strict';
  const App = window.LocalApp;
  // Keep the native select as the value/event contract; the popup supplies two aligned columns.
  function enhance(select) {
    const root = document.createElement('span'), trigger = document.createElement('button'), menu = document.createElement('div');
    root.className = 'counted-select'; trigger.type = 'button'; trigger.className = 'counted-select-trigger';
    menu.className = 'counted-select-menu'; menu.id = select.id + 'Menu'; menu.setAttribute('popover', 'auto'); menu.setAttribute('role', 'listbox');
    const label = select.getAttribute('aria-label') || Array.from(select.closest('label').childNodes).filter(node => node !== select).map(node => node.textContent).join('').trim();
    menu.setAttribute('aria-label', label); trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-controls', menu.id); trigger.setAttribute('aria-expanded', 'false');
    select.classList.add('counted-select-native'); select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
    select.after(root); root.append(trigger, menu);
    const close = () => { if (menu.matches(':popover-open')) menu.hidePopover(); };
    const refresh = () => {
      trigger.textContent = select.selectedOptions[0]?.textContent || '';
      trigger.setAttribute('aria-label', label + ': ' + trigger.textContent);
      menu.replaceChildren(...Array.from(select.options, function (option) {
        const row = document.createElement('button'), name = document.createElement('span'), count = document.createElement('span');
        row.type = 'button'; row.setAttribute('role', 'option'); row.setAttribute('aria-selected', String(option.selected)); row.tabIndex = -1;
        name.textContent = option.textContent; count.textContent = option.dataset.count || '0'; count.className = 'filter-option-count'; row.append(name, count);
        row.addEventListener('click', function (event) { event.preventDefault(); close(); select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); refresh(); trigger.focus(); });
        return row;
      }));
    };
    const open = () => {
      refresh(); const rect = trigger.getBoundingClientRect(), width = Math.min(Math.max(rect.width, 220), innerWidth - 16);
      menu.style.width = width + 'px'; menu.style.left = Math.max(8, Math.min(rect.left, innerWidth - width - 8)) + 'px';
      const below = innerHeight - rect.bottom - 12, above = rect.top - 12;
      const opensBelow = below >= Math.min(250, above);
      menu.style.maxHeight = Math.max(60, Math.min(320, opensBelow ? below : above)) + 'px';
      menu.showPopover();
      menu.style.top = (opensBelow ? rect.bottom + 4 : Math.max(8, rect.top - menu.getBoundingClientRect().height - 4)) + 'px';
      (menu.querySelector('[aria-selected="true"]') || menu.firstElementChild)?.focus();
    };
    trigger.addEventListener('click', event => { event.preventDefault(); menu.matches(':popover-open') ? close() : open(); });
    trigger.addEventListener('keydown', event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(); } });
    menu.addEventListener('toggle', () => trigger.setAttribute('aria-expanded', String(menu.matches(':popover-open'))));
    menu.addEventListener('keydown', function (event) {
      const rows = Array.from(menu.children), index = rows.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        rows[event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length]?.focus();
      } else if (event.key === 'Escape' || event.key === 'Tab') { close(); trigger.focus(); if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); } }
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        event.stopPropagation(); rows.slice(index + 1).concat(rows.slice(0, index + 1)).find(row => row.firstElementChild.textContent.toLowerCase().startsWith(event.key.toLowerCase()))?.focus();
      }
    });
    select.addEventListener('change', refresh);
    new MutationObserver(refresh).observe(select, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', close); window.addEventListener('scroll', event => { if (!menu.contains(event.target)) close(); }, true);
    refresh();
  }
  App.countedSelect = { init: function () { document.querySelectorAll('[data-counted-select]').forEach(enhance); } };
})();
