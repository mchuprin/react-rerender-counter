type RenderComponent = {
  name: string;
  renderCount: number;
  totalTime: number;
  avgTime: number;
  triggers: string[];
};

type ExtensionMessage =
  | { type: 'REACT_DETECTED' }
  | { type: 'RENDER_DATA'; components: RenderComponent[] }
  | { type: 'GET_REACT_STATE'; tabId: number }
  | { type: 'RESET' };

type PanelPortMessage = { type: 'SUBSCRIBE'; tabId: number };

const tabStates = new Map<number, { detected: boolean }>();
const tabRenderData = new Map<number, Map<string, RenderComponent>>();
const panelPorts = new Map<number, chrome.runtime.Port>();

chrome.runtime.onMessage.addListener((msg: ExtensionMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (msg.type === 'REACT_DETECTED' && tabId) {
    tabStates.set(tabId, { detected: true });
    chrome.action.setBadgeText({ text: 'R', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#2196F3', tabId });
    sendResponse();
    return true;
  }

  if (msg.type === 'RENDER_DATA' && tabId) {
    const data = new Map<string, RenderComponent>();
    for (const comp of msg.components) {
      data.set(comp.name, comp);
    }
    tabRenderData.set(tabId, data);

    const port = panelPorts.get(tabId);
    if (port) {
      port.postMessage({ type: 'UPDATE', components: msg.components });
    }
    sendResponse();
    return true;
  }

  if (msg.type === 'GET_REACT_STATE') {
    const state = tabStates.get(msg.tabId);
    sendResponse({ detected: state?.detected ?? false });
    return true;
  }

  if (msg.type === 'RESET' && tabId) {
    tabRenderData.delete(tabId);
    const port = panelPorts.get(tabId);
    if (port) {
      port.postMessage({ type: 'UPDATE', components: [] });
    }
    sendResponse();
    return true;
  }

  return false;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'render-panel') return;

  port.onMessage.addListener((msg: PanelPortMessage) => {
    if (msg.type === 'SUBSCRIBE') {
      panelPorts.set(msg.tabId, port);

      const data = tabRenderData.get(msg.tabId);
      const components = data ? Array.from(data.values()) : [];
      port.postMessage({ type: 'UPDATE', components });
    }
  });

  port.onDisconnect.addListener(() => {
    for (const [tabId, p] of panelPorts) {
      if (p === port) {
        panelPorts.delete(tabId);
        break;
      }
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
  tabRenderData.delete(tabId);
  panelPorts.delete(tabId);
});
