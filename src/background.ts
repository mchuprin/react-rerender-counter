const tabStates = new Map();

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg.type === 'REACT_DETECTED') {
    tabStates.set(tabId, { detected: true });
    chrome.action.setBadgeText({ text: 'R', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#2196F3', tabId });
  }

  if (msg.type === 'GET_REACT_STATE') {
    const state = tabStates.get(msg.tabId);
    return { detected: state?.detected ?? false };
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});
