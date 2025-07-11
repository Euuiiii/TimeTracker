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
let reminderCheckInterval = null;

async function getExcludedDomains() {
  const stored = await browser.storage.local.get(["settings"]);
  const settings = stored.settings || {};
  if (settings.excludeDomains) {
    return settings.excludeDomains.split(",").map(d => d.trim()).filter(Boolean);
  }
  return [];
}

async function getReminderSettings() {
  const stored = await browser.storage.local.get(["settings"]);
  const settings = stored.settings || {};
  return {
    enabled: settings.reminderEnabled || false,
    defaultLimit: settings.reminderTimeLimit || 30
  };
}

async function checkTimeLimits(domain, currentSeconds) {
  const reminderSettings = await getReminderSettings();
  if (!reminderSettings.enabled) return;

  const limitSeconds = reminderSettings.defaultLimit * 60;

  if (currentSeconds >= limitSeconds) {
    // Show notification
    const notificationOptions = {
      type: 'basic',
      iconUrl: 'timetracker.png',
      title: 'Time Limit Reached!',
      message: `You've spent ${Math.floor(currentSeconds / 60)} minutes on ${domain}. Consider taking a break!`
    };

    try {
      if (browser.notifications) {
        await browser.notifications.create(`time-limit-${domain}`, notificationOptions);
      }
    } catch (e) {
      console.log('Notification not supported or failed:', e);
    }
  }
}

async function updateTime(tabId, url) {
  let domain = "";
  try {
    domain = new URL(url).hostname;
  } catch (e) {
    // Invalid URL (e.g., chrome://, about:blank, etc.)
    return;
  }
  if (!domain) return; // Skip if domain is empty

  const endTime = Date.now();

  // Check if domain is excluded
  const excludedDomains = await getExcludedDomains();
  if (excludedDomains.includes(domain)) {
    currentTab = domain;
    startTime = Date.now();
    return;
  }

  // Always load timeData at the start
  const stored = await browser.storage.local.get("timeData");
  const timeData = stored.timeData || {};

  if (currentTab && startTime && !excludedDomains.includes(currentTab)) {
    const timeSpent = Math.floor((endTime - startTime) / 1000);

    if (!timeData[currentTab]) {
      timeData[currentTab] = { seconds: 0, lastVisited: 0 };
    } else if (typeof timeData[currentTab] === 'number') {
      // Migrate old format
      timeData[currentTab] = { seconds: timeData[currentTab], lastVisited: 0 };
    }
    timeData[currentTab].seconds += timeSpent;
    timeData[currentTab].lastVisited = endTime;

    // Check time limits for the previous tab
    await checkTimeLimits(currentTab, timeData[currentTab].seconds);

    await browser.storage.local.set({ timeData });
  }

  if (!timeData[domain]) {
    timeData[domain] = { seconds: 0, lastVisited: 0 };
  } else if (typeof timeData[domain] === 'number') {
    // Migrate old format
    timeData[domain] = { seconds: timeData[domain], lastVisited: 0 };
  }
  timeData[domain].lastVisited = endTime;

  await browser.storage.local.set({ timeData });

  currentTab = domain;
  startTime = Date.now();
}

// Start reminder checking when extension loads
async function startReminderChecking() {
  const reminderSettings = await getReminderSettings();
  if (reminderSettings.enabled) {
    // Check every 30 seconds
    reminderCheckInterval = setInterval(async () => {
      if (currentTab) {
        const stored = await browser.storage.local.get("timeData");
        const timeData = stored.timeData || {};
        const currentData = timeData[currentTab];
        if (currentData) {
          await checkTimeLimits(currentTab, currentData.seconds);
        }
      }
    }, 30000); // 30 seconds
  }
}

// Stop reminder checking
function stopReminderChecking() {
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval);
    reminderCheckInterval = null;
  }
}

// Listen for settings changes to start/stop reminder checking
browser.storage.onChanged && browser.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    const newSettings = changes.settings.newValue;
    if (newSettings && newSettings.reminderEnabled) {
      startReminderChecking();
    } else {
      stopReminderChecking();
    }
  }
});

// Listen for reset message from popup
browser.runtime.onMessage && browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "RESET_ALL_DATA") {
    browser.storage.local.set({ timeData: {} });
    sendResponse({ success: true });
  }
  if (msg && msg.type === "FORCE_UPDATE_TIME" && msg.tabId && msg.url) {
    updateTime(msg.tabId, msg.url);
    sendResponse({ success: true });
  }
});

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

// Initialize reminder checking on startup
startReminderChecking();
