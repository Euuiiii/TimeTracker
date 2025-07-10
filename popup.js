if (typeof browser === "undefined") {
  var browser = (function () {
    return window.chrome ? window.chrome : {};
  })();
  browser.storage = browser.storage || chrome.storage;
}

    document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("list");
  const stored = await browser.storage.local.get("timeData");
  const timeData = stored.timeData || {};

  for (const domain in timeData) {
    const li = document.createElement("li");
    li.textContent = `${domain}: ${Math.floor(timeData[domain] / 60)} min`;
    list.appendChild(li);
  }

  document.getElementById("clear").addEventListener("click", async () => {
    await browser.storage.local.set({ timeData: {} });
    list.innerHTML = "";
  });
});
