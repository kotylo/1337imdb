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
    console.log("Settings timestamp to null for all items in the storage");
    chrome.storage.local.get(null, items => {
        if (items){
            for (let key in items) {
                var item = items[key];
                console.dir(item);
                if (item == null){
                    continue;
                }
                
                item.timestamp = null;

                var updatedItem = {};
                updatedItem[key] = item;
                chrome.storage.local.set(updatedItem);
            }
        }
    });

    //chrome.storage.local.clear();
};