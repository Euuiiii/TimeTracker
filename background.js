if (typeof browser === "undefined") {
  var browser = (function () {
    return window.chrome ? window.chrome : {};
  })();
  browser.storage = browser.storage || chrome.storage;
  browser.tabs = browser.tabs || chrome.tabs;
  browser.windows = browser.windows || chrome.windows;
  browser.notifications = browser.notifications || chrome.notifications;
}

let currentTab = null;
let startTime = null;
let reminderCheckInterval = null;
let trackingPaused = false;
let pauseStartTime = null;

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
    // Use sessionStorage to track if notification was shown for this domain today
    const todayKey = `${domain}-reminder-notified-${new Date().toDateString()}`;
    if (sessionStorage.getItem(todayKey)) return;
    
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
        // Mark as notified for today
        sessionStorage.setItem(todayKey, '1');
      }
    } catch (e) {
      console.log('Notification not supported or failed:', e);
    }
  }
}

async function checkSiteSpecificTimer(domain, currentSeconds) {
  const stored = await browser.storage.local.get(["siteTimers"]);
  const siteTimers = stored.siteTimers || {};
  const timerMinutes = siteTimers[domain];
  if (!timerMinutes) return;
  const timerSeconds = timerMinutes * 60;
  // Use sessionStorage to track if notification was shown for this domain today
  const todayKey = `${domain}-timer-notified-${new Date().toDateString()}`;
  if (sessionStorage.getItem(todayKey)) return;
  if (currentSeconds >= timerSeconds) {
    // Show notification for site-specific timer
    const notificationOptions = {
      type: 'basic',
      iconUrl: 'timetracker.png',
      title: 'Site Timer Reached!',
      message: `You've spent ${Math.floor(currentSeconds / 60)} minutes on ${domain}. Your custom timer of ${timerMinutes} minutes has been reached!`
    };

    try {
      if (browser.notifications) {
        await browser.notifications.create(`site-timer-${domain}`, notificationOptions);
        // Mark as notified for today
        sessionStorage.setItem(todayKey, '1');
        
        // Remove the site timer after showing notification
        delete siteTimers[domain];
        await browser.storage.local.set({ siteTimers });
      }
    } catch (e) {
      console.log('Site timer notification not supported or failed:', e);
    }
  }
}

async function updateTime(tabId, url) {
  // Don't track time if paused
  if (trackingPaused) return;
  
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
    await checkSiteSpecificTimer(currentTab, timeData[currentTab].seconds);

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

// Start site-specific timer checking (always active)
function startSiteTimerChecking() {
  // Check every 30 seconds for site-specific timers
  setInterval(async () => {
    if (currentTab) {
      const stored = await browser.storage.local.get("timeData");
      const timeData = stored.timeData || {};
      const currentData = timeData[currentTab];
      if (currentData) {
        await checkSiteSpecificTimer(currentTab, currentData.seconds);
      }
    }
  }, 30000); // 30 seconds
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
  if (msg && msg.type === "TOGGLE_PAUSE") {
    togglePauseTracking();
    sendResponse({ success: true, paused: trackingPaused });
  }
  if (msg && msg.type === "GET_PAUSE_STATUS") {
    sendResponse({ 
      success: true, 
      paused: trackingPaused, 
      pauseStartTime: pauseStartTime,
      pauseDuration: pauseStartTime ? Math.floor((Date.now() - pauseStartTime) / 1000) : 0
    });
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
startSiteTimerChecking();

// Load pause state on startup
async function loadPauseState() {
  try {
    const stored = await browser.storage.local.get(["pauseState"]);
    const pauseState = stored.pauseState || {};
    trackingPaused = pauseState.trackingPaused || false;
    pauseStartTime = pauseState.pauseStartTime || null;
  } catch (error) {
    console.error('Error loading pause state:', error);
  }
}

// Toggle pause tracking
async function togglePauseTracking() {
  trackingPaused = !trackingPaused;
  
  if (trackingPaused) {
    // Pause tracking
    pauseStartTime = Date.now();
  } else {
    // Resume tracking - adjust startTime to account for pause
    if (pauseStartTime && startTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      startTime += pauseDuration; // Adjust start time to account for pause
    }
    pauseStartTime = null;
  }
  
  // Save pause state
  try {
    await browser.storage.local.set({
      pauseState: {
        trackingPaused: trackingPaused,
        pauseStartTime: pauseStartTime
      }
    });
  } catch (error) {
    console.error('Error saving pause state:', error);
  }
}

// Load pause state when extension starts
loadPauseState();
