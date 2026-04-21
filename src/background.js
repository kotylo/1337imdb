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
        const query = encodeURIComponent(request.movie.name);
        fetch(`https://v3.sg.media-imdb.com/suggestion/x/${query}.json`)
            .then(res => res.text())
            .then(json => sendResponse(json));
    } else if (request.action === "getMovie") {
        const query = `query { title(id: "${request.movie.id}") { ratingsSummary { aggregateRating voteCount } releaseDate { day month year } titleGenres { genres { genre { text } } } } }`;
        fetch('https://graphql.imdb.com/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ query: query })
        })
            .then(res => res.text())
            .then(json => sendResponse(json));
    }

    return true;
});