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

  emptyState.textContent = 'Loading...';
  emptyState.style.display = 'block';

  const stored = await browser.storage.local.get("timeData");
  const timeData = stored.timeData || {};

  list.innerHTML = '';
  const entries = Object.entries(timeData);
  entries.sort((a, b) => (b[1].seconds || 0) - (a[1].seconds || 0));

  const totalTime = entries.reduce((sum, [, data]) => sum + (data.seconds || 0), 0);

  let hasData = false;
  const maxToShow = 5;
  let showAll = false;

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

  toggleStatsBtn.addEventListener("click", () => {
    const isVisible = dailyStats.style.display !== "none";
    dailyStats.style.display = isVisible ? "none" : "block";
    toggleStatsBtn.textContent = isVisible ? "Show" : "Hide";
  });

  function getFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  }

  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsBtn = document.getElementById("close-settings");
  const excludeDomainsInput = document.getElementById("exclude-domains");
  const timeFormatSelect = document.getElementById("time-format");
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  const siteTimerDomain = document.getElementById("site-timer-domain");
  const siteTimerHours = document.getElementById("site-timer-hours");
  const siteTimerMinutes = document.getElementById("site-timer-minutes");
  const saveSiteTimerBtn = document.getElementById("save-site-timer");
  const siteTimerError = document.getElementById("site-timer-error");

  settingsBtn.addEventListener("click", async () => {
    await loadSettings();
    populateSiteDropdown();
    if (siteTimerDomain.value) {
      await loadSiteTimer(siteTimerDomain.value);
    }
    settingsModal.style.display = "flex";
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.style.display = "none";
    loadSettings();
  });

  async function loadSettings() {
    const stored = await browser.storage.local.get(["settings"]);
    const settings = stored.settings || {};
    excludeDomainsInput.value = settings.excludeDomains || "";
    timeFormatSelect.value = settings.timeFormat || "minsec";
    darkModeToggle.checked = settings.darkMode || false;
    applyDarkMode(settings.darkMode);
  }

  async function saveSettings() {
    const settings = {
      excludeDomains: excludeDomainsInput.value,
      timeFormat: timeFormatSelect.value,
      darkMode: darkModeToggle.checked,
    };
    await browser.storage.local.set({ settings });
    applyDarkMode(settings.darkMode);
    renderList();
  }

  const saveSettingsBtn = document.getElementById("save-settings");
  saveSettingsBtn.addEventListener("click", async () => {
    await saveSettings();
  });

  function applyDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }

  function getFilteredEntries() {
    const storedSettings = browser.storage.local.get(["settings"]);
    let excludeDomains = [];
    if (storedSettings && storedSettings.settings && storedSettings.settings.excludeDomains) {
      excludeDomains = storedSettings.settings.excludeDomains.split(",").map(d => d.trim()).filter(Boolean);
    }
    return entries.filter(([domain]) => !excludeDomains.includes(domain));
  }

  function populateSiteDropdown() {
    siteTimerDomain.innerHTML = '';
    for (const [domain] of entries) {
      const option = document.createElement('option');
      option.value = domain;
      option.textContent = domain;
      siteTimerDomain.appendChild(option);
    }
  }

  async function loadSiteTimer(domain) {
    const stored = await browser.storage.local.get(["siteTimers"]);
    const siteTimers = stored.siteTimers || {};
    const timer = siteTimers[domain];
    if (timer) {
      siteTimerHours.value = Math.floor(timer / 60);
      siteTimerMinutes.value = timer % 60;
    } else {
      siteTimerHours.value = 0;
      siteTimerMinutes.value = 0;
    }
  }

  saveSiteTimerBtn.addEventListener('click', async () => {
    const domain = siteTimerDomain.value;
    const hours = parseInt(siteTimerHours.value) || 0;
    const minutes = parseInt(siteTimerMinutes.value) || 0;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      siteTimerError.textContent = 'Invalid time.';
      siteTimerError.style.display = 'block';
      return;
    }
    siteTimerError.style.display = 'none';
    const totalMinutes = hours * 60 + minutes;
    const stored = await browser.storage.local.get(["siteTimers"]);
    const siteTimers = stored.siteTimers || {};
    siteTimers[domain] = totalMinutes;
    await browser.storage.local.set({ siteTimers });
    settingsModal.style.display = 'none';
  });

  siteTimerDomain.addEventListener('change', (e) => {
    loadSiteTimer(e.target.value);
  });

  settingsBtn.addEventListener("click", async () => {
    populateSiteDropdown();
    if (siteTimerDomain.value) {
      await loadSiteTimer(siteTimerDomain.value);
    }
  });

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
      let timeStr = '';
      if (settings.timeFormat === 'min') {
        timeStr = `${min} min${min !== 1 ? 's' : ''}`;
      } else if (settings.timeFormat === 'hrmin') {
        const hr = Math.floor(totalSeconds / 3600);
        const minOnly = Math.floor((totalSeconds % 3600) / 60);
        if (hr > 0) {
          timeStr = `${hr} hr${hr !== 1 ? 's' : ''} ${minOnly} min${minOnly !== 1 ? 's' : ''}`;
        } else {
          timeStr = `${minOnly} min${minOnly !== 1 ? 's' : ''}`;
        }
      } else {
        timeStr = `${min} min${min !== 1 ? 's' : ''} ${sec} sec`;
      }
      const favicon = document.createElement('img');
      favicon.className = 'favicon';
      favicon.src = getFaviconUrl(domain);
      favicon.alt = '';
      favicon.onerror = () => { favicon.style.display = 'none'; };
      li.appendChild(favicon);
      const mainLine = document.createElement('span');
      mainLine.textContent = `${domain}: ${timeStr}${percent}`;
      li.appendChild(mainLine);
      if (lastVisitedStr) {
        const small = document.createElement('div');
        small.className = 'last-visited';
        small.textContent = lastVisitedStr;
        li.appendChild(small);
      }
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.title = 'Delete site data';
      deleteBtn.style.background = 'none';
      deleteBtn.style.border = 'none';
      deleteBtn.style.marginLeft = 'auto';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const stored = await browser.storage.local.get("timeData");
        const timeData = stored.timeData || {};
        delete timeData[domain];
        await browser.storage.local.set({ timeData });
        renderList();
        calculateDailyStats();
      });
      li.appendChild(deleteBtn);
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.gap = '8px';
      li.title = `Exact: ${totalSeconds} seconds\n${lastVisitedStr}`;
      list.appendChild(li);
      count++;
    }
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

  browser.tabs && browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs[0]) {
      browser.runtime.sendMessage({ type: "FORCE_UPDATE_TIME", tabId: tabs[0].id, url: tabs[0].url });
    }
  });
});
