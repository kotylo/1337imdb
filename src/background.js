let color = "#3aa757";

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({color: color}, () => {
        console.log("The color is %cgreen.", `color: ${color}`);
    });
    console.log("done");
});

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    let movie = request.movie;

    console.log(sender.tab ?
        "from a content script:" + sender.tab.url :
        "from the extension");

    fetch(`https://imdb.com/find?q=${movie.name}&s=tt&ttype=ft&ref_=fn_ft&count=3`)
    .then(res => { res.text() })
    .then(html => {
        let parser = new DOMParser();
        let doc = parser.parseFromString(html, "text/html");
        let [link] = doc.getElementsByClassName("findResult");
        if (link == null) {
            console.error("link is null");
            return;
        }
        let [a] = link.getElementsByTagName("a");
        if (a == null) {
            console.error("a is null");
            return;
        }
        let href = a.getAttribute("href");
        if (href == null) {
            console.error("href is null");
            return;
        }
        let [id] = href.split("/");
        if (id == null) {
            console.error("id is null");
            return;
        }
        movie.id = id;
        movie.href = href;
        return movie;
    })
    .then(movie => {
        if (movie == null) {
            return;
        }
        return fetch(`https://imdb.com/${movie.href}`)
        .then(res => { res.text() })
        .then(html => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(html, "text/html");
            let [rating] = doc.getElementsByClassName("ratingValue");
            if (rating == null) {
                console.error("rating is null");
                return;
            }
            movie.rating = rating.textContent;
            return movie;
        });
    })
    .then(movie => sendResponse({result: movie}));

    return true;
});