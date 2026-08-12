interface RenderDataEvent extends CustomEvent {
  detail: { components: unknown[] };
}

window.addEventListener('REACT_DETECTED', () => {
  chrome.runtime.sendMessage({ type: 'REACT_DETECTED' });
});

window.addEventListener('RENDER_DATA', (event) => {
  const e = event as RenderDataEvent;
  chrome.runtime.sendMessage({ type: 'RENDER_DATA', components: e.detail.components });
});
