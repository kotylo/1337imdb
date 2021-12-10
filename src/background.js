let color = "#3aa757";

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({color: color}, () => {
        console.log("The color is %cgreen.", `color: ${color}`);
    });
    console.log("done");
});