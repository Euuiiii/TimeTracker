if (typeof browser === "undefined") {
  var browser = (function () {
    return window.chrome ? window.chrome : {};
  })();
  browser.storage = browser.storage || chrome.storage;
  browser.tabs = browser.tabs || chrome.tabs;
}

document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("list");
  const emptyState = document.getElementById("empty-state");
  const toggleStatsBtn = document.getElementById("toggle-stats");
  const dailyStats = document.getElementById("daily-stats");
  const todayTotal = document.getElementById("today-total");
  const todaySites = document.getElementById("today-sites");
  const todayTopSite = document.getElementById("today-top-site");
  const todayTable = document.getElementById("today-table");
  
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

  function renderTodayTable() {
    const today = new Date().toDateString();
    let rows = [];
    for (const [domain, data] of entries) {
      if (data.lastVisited) {
        const lastVisitedDate = new Date(data.lastVisited).toDateString();
        if (lastVisitedDate === today) {
          const totalSeconds = data.seconds || 0;
          const min = Math.floor(totalSeconds / 60);
          const sec = totalSeconds % 60;
          let timeStr = min > 0 ? `${min} min${min !== 1 ? 's' : ''} ${sec} sec` : `${sec} sec`;
          rows.push(`
            <tr>
              <td><img class="favicon" src="${getFaviconUrl(domain)}" alt="">${domain}</td>
              <td>${timeStr}</td>
            </tr>
          `);
        }
      }
    }
    if (rows.length === 0) {
      todayTable.innerHTML = '<div style="color:#888; text-align:center;">No sites visited today.</div>';
      return;
    }
    todayTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Website</th>
            <th>Time Spent</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    `;
  }

  toggleStatsBtn.addEventListener("click", () => {
    const isVisible = dailyStats.style.display !== "none";
    dailyStats.style.display = isVisible ? "none" : "block";
    todayTable.style.display = isVisible ? "none" : "block";
    toggleStatsBtn.textContent = isVisible ? "Show" : "Hide";
    if (!isVisible) {
      renderTodayTable();
    }
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
  const reminderEnabled = document.getElementById("reminder-enabled");
  const reminderTimeLimit = document.getElementById("reminder-time-limit");

  settingsBtn.addEventListener("click", async () => {
    try {
      await loadSettings();
      populateSiteDropdown();
      if (siteTimerDomain.value) {
        await loadSiteTimer(siteTimerDomain.value);
      }
      await renderSiteTimerList();
      settingsModal.style.display = "flex";
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.style.display = "none";
    loadSettings();
  });
  
  // Close modal when clicking outside the content area
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = "none";
      loadSettings();
    }
  });

  async function loadSettings() {
    const stored = await browser.storage.local.get(["settings"]);
    const settings = stored.settings || {};
    excludeDomainsInput.value = settings.excludeDomains || "";
    timeFormatSelect.value = settings.timeFormat || "minsec";
    darkModeToggle.checked = settings.darkMode || false;
    reminderEnabled.checked = settings.reminderEnabled || false;
    reminderTimeLimit.value = settings.reminderTimeLimit || 30;
    applyDarkMode(settings.darkMode);
  }

  async function saveSettings() {
    const settings = {
      excludeDomains: excludeDomainsInput.value,
      timeFormat: timeFormatSelect.value,
      darkMode: darkModeToggle.checked,
      reminderEnabled: reminderEnabled.checked,
      reminderTimeLimit: parseInt(reminderTimeLimit.value) || 30,
    };
    await browser.storage.local.set({ settings });
    applyDarkMode(settings.darkMode);
    renderList();
  }

  const saveSettingsBtn = document.getElementById("save-settings");
  saveSettingsBtn.addEventListener("click", async () => {
    await saveSettings();
    settingsModal.style.display = 'none';
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
    try {
      const domain = siteTimerDomain.value;
      if (!domain) {
        siteTimerError.textContent = 'Please select a site.';
        siteTimerError.style.display = 'block';
        return;
      }
      
      const hours = parseInt(siteTimerHours.value) || 0;
      const minutes = parseInt(siteTimerMinutes.value) || 0;
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        siteTimerError.textContent = 'Invalid time.';
        siteTimerError.style.display = 'block';
        return;
      }
      
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes === 0) {
        siteTimerError.textContent = 'Please set a time greater than 0.';
        siteTimerError.style.display = 'block';
        return;
      }
      
      siteTimerError.style.display = 'none';
      const stored = await browser.storage.local.get(["siteTimers"]);
      const siteTimers = stored.siteTimers || {};
      siteTimers[domain] = totalMinutes;
      await browser.storage.local.set({ siteTimers });
      
      // Update the site timer list to show the new timer
      await renderSiteTimerList();
      
      // Reset the form for adding another timer
      siteTimerHours.value = 0;
      siteTimerMinutes.value = 0;
      
      // Keep the settings modal open
    } catch (error) {
      console.error('Error saving site timer:', error);
      siteTimerError.textContent = 'Error saving timer.';
      siteTimerError.style.display = 'block';
    }
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
    const stored = await browser.storage.local.get(["timeData", "settings", "siteTimers"]);
    const timeData = stored.timeData || {};
    const entries = Object.entries(timeData);
    const settings = stored.settings || {};
    const siteTimers = stored.siteTimers || {};
    let excludeDomains = [];
    if (settings.excludeDomains) {
      excludeDomains = settings.excludeDomains.split(",").map(d => d.trim()).filter(Boolean);
    }
    const filteredEntries = entries.filter(([domain]) => !excludeDomains.includes(domain));
    // Sort by time spent (descending)
    filteredEntries.sort((a, b) => (b[1].seconds || 0) - (a[1].seconds || 0));
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
      // Show site-specific timer if set
      if (siteTimers[domain]) {
        const timerDiv = document.createElement('div');
        const timerMinutes = siteTimers[domain];
        const hr = Math.floor(timerMinutes / 60);
        const minOnly = timerMinutes % 60;
        let timerStr = '';
        if (hr > 0) {
          timerStr = `Timer: ${hr} hr${hr !== 1 ? 's' : ''} ${minOnly} min${minOnly !== 1 ? 's' : ''}`;
        } else {
          timerStr = `Timer: ${minOnly} min${minOnly !== 1 ? 's' : ''}`;
        }
        timerDiv.textContent = timerStr;
        timerDiv.style.fontSize = '12px';
        timerDiv.style.color = '#4f8cff';
        timerDiv.style.marginTop = '2px';
        li.appendChild(timerDiv);
      }
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

  // Render the list of sites with active timers in the settings modal
  async function renderSiteTimerList() {
    const siteTimerList = document.getElementById('site-timer-list');
    if (!siteTimerList) return;
    siteTimerList.innerHTML = '';
    const stored = await browser.storage.local.get(["siteTimers"]);
    const siteTimers = stored.siteTimers || {};
    const domains = Object.keys(siteTimers);
    if (domains.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No active site timers.';
      li.style.color = '#888';
      siteTimerList.appendChild(li);
      return;
    }
    for (const domain of domains) {
      const timerMinutes = siteTimers[domain];
      const hr = Math.floor(timerMinutes / 60);
      const minOnly = timerMinutes % 60;
      let timerStr = '';
      if (hr > 0) {
        timerStr = `${hr} hr${hr !== 1 ? 's' : ''} ${minOnly} min${minOnly !== 1 ? 's' : ''}`;
      } else {
        timerStr = `${minOnly} min${minOnly !== 1 ? 's' : ''}`;
      }
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.justifyContent = 'space-between';
      li.style.gap = '8px';
      li.style.fontSize = '14px';
      li.innerHTML = `<span><strong>${domain}</strong>: ${timerStr}</span>`;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-timer-btn';
      removeBtn.title = 'Remove timer';
      removeBtn.style.background = 'none';
      removeBtn.style.border = 'none';
      removeBtn.style.cursor = 'pointer';
      removeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b30000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const stored = await browser.storage.local.get(["siteTimers"]);
        const siteTimers = stored.siteTimers || {};
        delete siteTimers[domain];
        await browser.storage.local.set({ siteTimers });
        renderSiteTimerList();
      });
      li.appendChild(removeBtn);
      siteTimerList.appendChild(li);
    }
  }



  await loadSettings();
  calculateDailyStats();
  renderList();

  document.getElementById("clear").addEventListener("click", async () => {
    try {
      await browser.storage.local.set({ timeData: {} });
      list.innerHTML = "";
      emptyState.textContent = 'No browsing data yet.';
      emptyState.style.display = 'block';
      calculateDailyStats();
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  });

  try {
    browser.tabs && browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        browser.runtime.sendMessage({ type: "FORCE_UPDATE_TIME", tabId: tabs[0].id, url: tabs[0].url });
      }
    }).catch(error => {
      console.error('Error querying tabs:', error);
    });
  } catch (error) {
    console.error('Error in tab query:', error);
  }
});
