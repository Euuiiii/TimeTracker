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
  // Sort by time spent
  entries.sort((a, b) => b[1] - a[1]);

  let hasData = false;
  for (const [domain, totalSeconds] of entries) {
    hasData = true;
    const li = document.createElement("li");
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    li.textContent = `${domain}: ${min} min${min !== 1 ? 's' : ''} ${sec} sec`;
    list.appendChild(li);
  }

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
