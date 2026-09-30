(function () {
  'use strict';
  const App = window.LocalApp;
  const controls = new WeakMap();
  function level(node) { return /^H[123]$/.test(node.tagName) ? Number(node.tagName[1]) : 0; }
  function position(editor) {
    const surface = editor.parentElement, origin = surface.getBoundingClientRect();
    (controls.get(editor) || new Map()).forEach(function (button, heading) {
      button.hidden = heading.hidden || !heading.getClientRects().length;
      button.style.top = (heading.getBoundingClientRect().top - origin.top + surface.scrollTop + 4) + 'px';
    });
  }
  function decorate(editor) {
    // Older editors put non-editable controls inside the document. Never retain them.
    editor.querySelectorAll('[data-notes-toggle],.notes-collapse-toggle').forEach(function (button) { button.remove(); });
    // Recompute visibility from scratch after edits that change block nesting.
    const visibility = new Map(Array.from(editor.querySelectorAll('*'), function (node) { return [node, false]; }));
    editor.querySelectorAll('h1,h2,h3').forEach(function (heading) {
      if (!heading.textContent.trim()) delete heading.dataset.notesCollapsed;
    });
    const collapsed = [];
    function visit(container) {
      Array.from(container.childNodes).forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!collapsed.length || !node.textContent.trim()) return;
          const wrapper = document.createElement('span');
          node.replaceWith(wrapper); wrapper.appendChild(node); node = wrapper;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const headingLevel = level(node);
        if (headingLevel) {
          while (collapsed.length && collapsed[collapsed.length - 1] >= headingLevel) collapsed.pop();
          visibility.set(node, collapsed.length > 0);
          if (node.dataset.notesCollapsed === 'true') collapsed.push(headingLevel);
        } else if (node.querySelector('h1,h2,h3')) {
          visit(node);
        } else visibility.set(node, collapsed.length > 0);
      });
    }
    visit(editor);
    visibility.forEach(function (hidden, node) { if (node.hidden !== hidden) node.hidden = hidden; });
    const buttons = controls.get(editor) || new Map();
    controls.set(editor, buttons);
    buttons.forEach(function (button, heading) {
      if (!editor.contains(heading) || !level(heading) || !heading.textContent.trim()) { button.remove(); buttons.delete(heading); }
    });
    editor.querySelectorAll('h1,h2,h3').forEach(function (heading) {
      if (!heading.textContent.trim()) return;
      let button = buttons.get(heading);
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        button.className = 'notes-collapse-toggle';
        button.innerHTML = App.icons.markup('chevronRight');
        button.addEventListener('mousedown', function (event) { event.preventDefault(); });
        button.addEventListener('click', function () {
          heading.dataset.notesCollapsed = heading.dataset.notesCollapsed === 'true' ? 'false' : 'true';
          decorate(editor); button.focus();
        });
        editor.parentElement.appendChild(button); buttons.set(heading, button);
      }
      const expanded = heading.dataset.notesCollapsed !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', (expanded ? 'Collapse ' : 'Expand ') + heading.textContent.trim());
      button.title = expanded ? 'Collapse section' : 'Expand section';
    });
    position(editor);
  }
  function headingInput(editor, event) {
    if (event.isComposing || !['insertParagraph', 'deleteContentBackward'].includes(event.inputType)) return false;
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0), node = selection.anchorNode;
    const heading = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement).closest('h1,h2,h3');
    if (!heading || !editor.contains(heading)) return false;
    const before = range.cloneRange(); before.selectNodeContents(heading); before.setEnd(range.startContainer, range.startOffset);
    const after = range.cloneRange(); after.selectNodeContents(heading); after.setStart(range.endContainer, range.endOffset);
    if (event.inputType === 'deleteContentBackward' && before.toString()) return false;
    if (event.inputType === 'insertParagraph' && after.toString()) return false;
    event.preventDefault();
    delete heading.dataset.notesCollapsed;
    decorate(editor);
    if (event.inputType === 'insertParagraph' && heading.textContent.trim()) document.execCommand('insertParagraph');
    document.execCommand('formatBlock', false, 'p');
    return true;
  }
  App.notesOutline = { decorate: decorate, position: position, headingInput: headingInput };
})();
