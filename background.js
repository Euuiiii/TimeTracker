if (typeof browser === "undefined") {
  var browser = (function () {
    return window.chrome ? window.chrome : {};
  })();
  browser.storage = browser.storage || chrome.storage;
  browser.tabs = browser.tabs || chrome.tabs;
  browser.windows = browser.windows || chrome.windows;
}

let currentTab = null;
let startTime = null;

async function updateTime(tabId, url) {
  const domain = new URL(url).hostname;
  const endTime = Date.now();

  if (currentTab && startTime) {
    const timeSpent = Math.floor((endTime - startTime) / 1000);
    const stored = await browser.storage.local.get("timeData");
    const timeData = stored.timeData || {};

    if (!timeData[currentTab]) {
      timeData[currentTab] = 0;
    }
    timeData[currentTab] += timeSpent;

    await browser.storage.local.set({ timeData });
  }

  currentTab = domain;
  startTime = Date.now();
}

browser.tabs.onActivated.addListener(async activeInfo => {
  const tab = await browser.tabs.get(activeInfo.tabId);
  await updateTime(tab.id, tab.url);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === "complete") {
    updateTime(tabId, tab.url);
  }
});

browser.windows.onFocusChanged.addListener(windowId => {
  if (windowId === browser.windows.WINDOW_ID_NONE) return;
  browser.tabs.query({ active: true, windowId }).then(tabs => {
    if (tabs[0]) updateTime(tabs[0].id, tabs[0].url);
  });
});
