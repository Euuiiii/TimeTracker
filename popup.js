if (typeof browser === "undefined") {
  var browser = (function () {
    return window.chrome ? window.chrome : {};
  })();
  browser.storage = browser.storage || chrome.storage;
}

    document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("list");
  const emptyState = document.getElementById("empty-state");
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

  function renderList() {
    list.innerHTML = '';
    let count = 0;
    for (const [domain, data] of entries) {
      if (!showAll && count >= maxToShow) break;
      hasData = true;
      const li = document.createElement("li");
      const totalSeconds = data.seconds || 0;
      const min = Math.floor(totalSeconds / 60);
      const sec = totalSeconds % 60;
      let percent = '';
      if (totalTime > 0) {
        percent = ` (${((totalSeconds / totalTime) * 100).toFixed(1)}%)`;
      }
      let lastVisitedStr = '';
      if (data.lastVisited) {
        const lastVisited = new Date(data.lastVisited);
        lastVisitedStr = `Last visited: ${lastVisited.toLocaleString()}`;
      }
      // Main line: domain, time, percent
      const mainLine = document.createElement('span');
      mainLine.textContent = `${domain}: ${min} min${min !== 1 ? 's' : ''} ${sec} sec${percent}`;
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
    if (!showAll && entries.length > maxToShow) {
      const showMoreBtn = document.createElement('button');
      showMoreBtn.textContent = `Show More (${entries.length - maxToShow} more)`;
      showMoreBtn.className = 'show-more-btn';
      showMoreBtn.onclick = () => {
        showAll = true;
        renderList();
      };
      list.appendChild(showMoreBtn);
    }
  }

  renderList();

  if (!hasData) {
    emptyState.textContent = 'No browsing data yet.';
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }

  document.getElementById("clear").addEventListener("click", async () => {
    await browser.storage.local.set({ timeData: {} });
    list.innerHTML = "";
    emptyState.textContent = 'No browsing data yet.';
    emptyState.style.display = 'block';
  });
});
