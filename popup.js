if (typeof browser === "undefined") {
  var browser = (function () {
    return window.chrome ? window.chrome : {};
  })();
  browser.storage = browser.storage || chrome.storage;
}

    document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("list");
  const emptyState = document.getElementById("empty-state");
  const toggleStatsBtn = document.getElementById("toggle-stats");
  const dailyStats = document.getElementById("daily-stats");
  const todayTotal = document.getElementById("today-total");
  const todaySites = document.getElementById("today-sites");
  const todayTopSite = document.getElementById("today-top-site");
  
  list.innerHTML = '';
  emptyState.style.display = 'none';

  // Show loading state
  emptyState.textContent = 'Loading...';
  emptyState.style.display = 'block';

  const stored = await browser.storage.local.get("timeData");
  const timeData = stored.timeData || {};

  list.innerHTML = '';
  const entries = Object.entries(timeData);
  // Sort by time spent (descending)
  entries.sort((a, b) => (b[1].seconds || 0) - (a[1].seconds || 0));

  // Calculate total time
  const totalTime = entries.reduce((sum, [, data]) => sum + (data.seconds || 0), 0);

  let hasData = false;
  const maxToShow = 5;
  let showAll = false;

  // Daily stats functionality
  function calculateDailyStats() {
    const today = new Date().toDateString();
    let todayTotalSeconds = 0;
    let todaySitesCount = 0;
    let todayTopSiteName = '-';
    let todayTopSiteTime = 0;

    for (const [domain, data] of entries) {
      if (data.lastVisited) {
        const lastVisitedDate = new Date(data.lastVisited).toDateString();
        if (lastVisitedDate === today) {
          todayTotalSeconds += data.seconds || 0;
          todaySitesCount++;
          if ((data.seconds || 0) > todayTopSiteTime) {
            todayTopSiteTime = data.seconds || 0;
            todayTopSiteName = domain;
          }
        }
      }
    }

    const todayMinutes = Math.floor(todayTotalSeconds / 60);
    const todaySecs = todayTotalSeconds % 60;
    
    todayTotal.textContent = todayMinutes > 0 ? 
      `${todayMinutes} min${todayMinutes !== 1 ? 's' : ''} ${todaySecs} sec` : 
      `${todaySecs} sec`;
    todaySites.textContent = todaySitesCount;
    todayTopSite.textContent = todayTopSiteName;
  }

  // Toggle stats visibility
  toggleStatsBtn.addEventListener("click", () => {
    const isVisible = dailyStats.style.display !== "none";
    dailyStats.style.display = isVisible ? "none" : "block";
    toggleStatsBtn.textContent = isVisible ? "Show" : "Hide";
  });

  // Favicon functionality
  function getFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  }

  // Settings panel logic
  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsBtn = document.getElementById("close-settings");
  const excludeDomainsInput = document.getElementById("exclude-domains");
  const timeFormatSelect = document.getElementById("time-format");
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  const reminderEnabled = document.getElementById("reminder-enabled");
  const reminderTimeLimit = document.getElementById("reminder-time-limit");

  // Show/hide settings modal
  settingsBtn.addEventListener("click", async () => {
    await loadSettings(); // Always reload settings when opening
    settingsModal.style.display = "flex";
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.style.display = "none";
    loadSettings(); // Revert inputs to last saved state
  });

  // Load settings from storage
  async function loadSettings() {
    const stored = await browser.storage.local.get(["settings"]);
    const settings = stored.settings || {};
    excludeDomainsInput.value = settings.excludeDomains || "";
    timeFormatSelect.value = settings.timeFormat || "minsec";
    darkModeToggle.checked = settings.darkMode || false;
    reminderEnabled.checked = settings.reminderEnabled || false;
    reminderTimeLimit.value = settings.reminderTimeLimit || "30";
    applyDarkMode(settings.darkMode);
  }

  // Save settings to storage
  async function saveSettings() {
    const settings = {
      excludeDomains: excludeDomainsInput.value,
      timeFormat: timeFormatSelect.value,
      darkMode: darkModeToggle.checked,
      reminderEnabled: reminderEnabled.checked,
      reminderTimeLimit: parseInt(reminderTimeLimit.value) || 30
    };
    await browser.storage.local.set({ settings });
    applyDarkMode(settings.darkMode);
    renderList(); // re-render in case settings affect display
  }

  // Add Save button logic
  const saveSettingsBtn = document.getElementById("save-settings");
  saveSettingsBtn.addEventListener("click", async () => {
    await saveSettings();
  });

  // Validate reminder settings
  reminderTimeLimit.addEventListener('input', function() {
    const value = parseInt(this.value);
    if (value < 1) this.value = 1;
    if (value > 480) this.value = 480;
  });

  // Dark mode logic
  function applyDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }

  // Filter out excluded domains
  function getFilteredEntries() {
    const storedSettings = browser.storage.local.get(["settings"]);
    let excludeDomains = [];
    if (storedSettings && storedSettings.settings && storedSettings.settings.excludeDomains) {
      excludeDomains = storedSettings.settings.excludeDomains.split(",").map(d => d.trim()).filter(Boolean);
    }
    return entries.filter(([domain]) => !excludeDomains.includes(domain));
  }

  // Update renderList to use settings
  async function renderList() {
    list.innerHTML = '';
    let count = 0;
    let hasData = false;
    const stored = await browser.storage.local.get(["settings"]);
    const settings = stored.settings || {};
    let excludeDomains = [];
    if (settings.excludeDomains) {
      excludeDomains = settings.excludeDomains.split(",").map(d => d.trim()).filter(Boolean);
    }
    const filteredEntries = entries.filter(([domain]) => !excludeDomains.includes(domain));
    const totalTime = filteredEntries.reduce((sum, [, data]) => sum + (data.seconds || 0), 0);
    for (const [domain, data] of filteredEntries) {
      if (!showAll && count >= maxToShow) break;
      hasData = true;
      const li = document.createElement("li");
      const totalSeconds = data.seconds || 0;
      let min = Math.floor(totalSeconds / 60);
      let sec = totalSeconds % 60;
      let percent = '';
      if (totalTime > 0) {
        percent = ` (${((totalSeconds / totalTime) * 100).toFixed(1)}%)`;
      }
      let lastVisitedStr = '';
      if (data.lastVisited) {
        const lastVisited = new Date(data.lastVisited);
        lastVisitedStr = `Last visited: ${lastVisited.toLocaleString()}`;
      }
      // Time format
      let timeStr = '';
      if (settings.timeFormat === 'min') {
        timeStr = `${min} min${min !== 1 ? 's' : ''}`;
      } else {
        timeStr = `${min} min${min !== 1 ? 's' : ''} ${sec} sec`;
      }
      // Add favicon
      const favicon = document.createElement('img');
      favicon.className = 'favicon';
      favicon.src = getFaviconUrl(domain);
      favicon.alt = '';
      favicon.onerror = () => {
        favicon.style.display = 'none';
      };
      li.appendChild(favicon);
      // Main line: domain, time, percent
      const mainLine = document.createElement('span');
      mainLine.textContent = `${domain}: ${timeStr}${percent}`;
      li.appendChild(mainLine);
      // Last visited as a new line below
      if (lastVisitedStr) {
        const small = document.createElement('div');
        small.className = 'last-visited';
        small.textContent = lastVisitedStr;
        li.appendChild(small);
      }
      li.title = `Exact: ${totalSeconds} seconds\n${lastVisitedStr}`;
      list.appendChild(li);
      count++;
    }
    // Show More button
    if (!showAll && filteredEntries.length > maxToShow) {
      const showMoreBtn = document.createElement('button');
      showMoreBtn.textContent = `Show More (${filteredEntries.length - maxToShow} more)`;
      showMoreBtn.className = 'show-more-btn';
      showMoreBtn.onclick = () => {
        showAll = true;
        renderList();
      };
      list.appendChild(showMoreBtn);
    }
    if (!hasData) {
      emptyState.textContent = 'No browsing data yet.';
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }
  }

  await loadSettings();
  calculateDailyStats();
  renderList();

  document.getElementById("clear").addEventListener("click", async () => {
    await browser.storage.local.set({ timeData: {} });
    list.innerHTML = "";
    emptyState.textContent = 'No browsing data yet.';
    emptyState.style.display = 'block';
    calculateDailyStats();
  });

  // At the start of your DOMContentLoaded handler in popup.js
  browser.tabs && browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]) {
      browser.runtime.sendMessage({ type: "FORCE_UPDATE_TIME", tabId: tabs[0].id, url: tabs[0].url });
    }
  });
});
