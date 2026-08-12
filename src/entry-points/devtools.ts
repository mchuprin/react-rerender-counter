const tabId = chrome.devtools.inspectedWindow.tabId;

chrome.runtime.sendMessage({ type: 'GET_REACT_STATE', tabId }, (response) => {
  if (response?.detected) {
    chrome.devtools.panels.create('React Rerenders', '', `panel.html?tabId=${tabId}`);
  }
});
