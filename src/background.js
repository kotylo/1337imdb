let color = "#3aa757";

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({color: color}, () => {
        console.log("The color is %cgreen.", `color: ${color}`);
    });
    console.log("done");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(sender.tab ?
        `fetch '${request.action}' request for movie '${request.movie.name}' from a content script: ${sender.tab.url}` :
        "from the extension");

    if (request.action === "findMovie") {
        // todo: add &ttype=ft (film titles?) to the options?
        fetch(`https://www.imdb.com/find?q=${request.movie.name}&s=tt&ttype=ft&ttype=tv&ref_=fn_ft&count=3`)
            .then(res => res.text())
            .then(html => sendResponse(html));
    } else if (request.action === "getMovie") {
        fetch(`https://www.imdb.com${request.movie.href}`)
            .then(res => res.text())
            .then(html => sendResponse(html));
    }

    return true;
});