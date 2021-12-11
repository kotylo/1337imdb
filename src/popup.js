// Initialize button with user's preferred color
let clearCache = document.getElementById("clearCache");

chrome.storage.sync.get("color", ({ color }) => {
    clearCache.style.backgroundColor = color;
});

clearCache.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: clearCacheFunction
    });
});

function clearCacheFunction() {
    chrome.storage.local.clear();
};

