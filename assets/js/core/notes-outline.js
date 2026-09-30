(function () {
  'use strict';
  const App = window.LocalApp;
  function level(node) { return /^H[123]$/.test(node.tagName) ? Number(node.tagName[1]) : 0; }
  function update(container) {
    const collapsed = [];
    Array.from(container.children).forEach(function (child) {
      const headingLevel = level(child);
      if (headingLevel) while (collapsed.length && collapsed[collapsed.length - 1] >= headingLevel) collapsed.pop();
      child.hidden = collapsed.length > 0;
      if (headingLevel && child.dataset.notesCollapsed === 'true') collapsed.push(headingLevel);
      if (!headingLevel && !child.hidden) update(child);
    });
  }
  function decorate(editor) {
    editor.querySelectorAll('h1,h2,h3').forEach(function (heading) {
      let button = heading.querySelector(':scope > .notes-collapse-toggle');
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        button.className = 'notes-collapse-toggle'; button.dataset.notesToggle = '';
        button.contentEditable = 'false'; heading.prepend(button);
      }
      const expanded = heading.dataset.notesCollapsed !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', (expanded ? 'Collapse ' : 'Expand ') + (heading.textContent.trim() || 'heading'));
      button.title = expanded ? 'Collapse section' : 'Expand section';
    });
    update(editor);
  }
  function toggle(editor, button) {
    const heading = button.closest('h1,h2,h3');
    if (!heading || !editor.contains(heading)) return;
    heading.dataset.notesCollapsed = heading.dataset.notesCollapsed === 'true' ? 'false' : 'true';
    decorate(editor);
    heading.querySelector('.notes-collapse-toggle')?.focus();
  }
  App.notesOutline = { decorate: decorate, toggle: toggle };
})();
