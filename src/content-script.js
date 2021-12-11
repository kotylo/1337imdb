// get first element with class "featured-list"
let moviesToCall = [];

let [featuredList] = document.getElementsByClassName("featured-list");
let trElements = featuredList.getElementsByTagName("tr");
for (let i = 0; i < trElements.length; i++) {
    let tr = trElements[i];
    var [td] = tr.getElementsByClassName("name");
    if (td == null) {
        continue;
    }

    //td.style.backgroundColor = "yellow";
    var moveieName = td.textContent;

    var [icon] = td.getElementsByClassName("icon");
    if (icon == null){
        //console.error("icon node is missing");
        continue;
    }

    moviesToCall.push({
        rawName: moveieName,
        name: getMovieName(moveieName),
        iconElement: icon,
    });

    // temp testing 3 items
    if (i > 5){
        break;
    }
}

document.body.style.backgroundColor = "orange";

// Start loading all the movies from the page
moviesToCall.map(m => getMovieInfo(m));

// ************
// functions
// ************

const promiseTimeout = time => () => new Promise(resolve => setTimeout(resolve, time));

function showRating(movie) {
    let link = document.createElement("a");
    link.href = `https://www.imdb.com${movie.href}`;
    link.target = "_blank";
    insertAfter(link, movie.iconElement);

    let imdb = document.createElement("div");
    imdb.textContent = `${movie.rating}`;

    let ratingCountPercentage = getOpacityPercentage(movie.ratingCount);
    let alphaColor = getColorFromPercentage(ratingCountPercentage);
    imdb.style.backgroundColor = `#F5C518${alphaColor}`;

    imdb.style.border = "1px solid black";
    imdb.style.padding = "5px";
    imdb.style.marginRight = "5px";
    imdb.style.borderRadius = "3px";
    imdb.style.fontSize = "12px";
    imdb.style.color = "black";
    imdb.style.textAlign = "center";
    imdb.style.verticalAlign = "middle";
    imdb.style.lineHeight = "3px";
    imdb.style.fontWeight = "bold";
    imdb.style.float = "left";
    link.appendChild(imdb);

    let votesContainer = document.createElement("div");
    votesContainer.style.float = "right";
    votesContainer.style.fontSize = "5px";
    votesContainer.textContent = `${movie.ratingCount} v.`;
    votesContainer.style.marginLeft = "5px";
    imdb.appendChild(votesContainer);
}

function getColorFromPercentage(percentage) {
    let alpha = Math.round(percentage * 255 / 100);
    let alphaHex = alpha.toString(16);
    return alphaHex;
}

function getOpacityPercentage(ratingCount) {
    let max = 1000;
    let min = 0;
    let range = max - min;
    
    let percentage = ratingCount / range * 100;
    if (percentage > 100){
        return 100;
    }
    return percentage;
}

function getMovieInfo(movie) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({action: "findMovie", movie: movie}, html => {
            if (html) {
                resolve(html);
            } else {
                reject(`Something went wrong with receiving the 'findMovie' fetch response from background.js for movie '${movie.name}'`);
            }
        });
    })
    .then(html => {
        let parser = new DOMParser();
        let doc = parser.parseFromString(html, "text/html");
        let [link] = doc.getElementsByClassName("findResult");
        if (link == null) {
            console.error(`link is null for movie '${movie.name}'. Try to call it yourself: https://www.imdb.com/find?q=${movie.name}&s=tt&ref_=fn_ft&count=3`);
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

        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({action: "getMovie", movie: movie}, html => {
                if (html) {
                    resolve(html);
                } else {
                    reject(`Something went wrong with receiving the 'getMovie' fetch response from background.js for movie '${movie.name}'`);
                }
            });
        })
        .then(html => {
            // find the rating inside the script tag with type="application/ld+json"
            let parser = new DOMParser();
            let doc = parser.parseFromString(html, "text/html");

            let scripts = doc.getElementsByTagName("script");
            if (scripts.length == 0) {
                console.error("there are no script tags");
                return;
            }

            var script = getScriptWithType(scripts, "application/ld+json");
            if (script == null) {
                console.error("script is null");
                return;
            }

            let [json] = script.textContent.split("\n");
            if (json == null) {
                console.error("json is null");
                return;
            }
            var parsedJson = JSON.parse(json);
            let rating = parsedJson.aggregateRating.ratingValue;
            if (rating == null) {
                console.error("rating is null");
                return;
            }

            let ratingCount = parsedJson.aggregateRating.ratingCount;
            if (ratingCount == null) {
                console.error("ratingCount is null");
                return;
            }

            movie.rating = rating;
            movie.ratingCount = ratingCount;
            return movie;
        });
    })
    .then(movie => {
        if (movie == null) {
            return;
        }
        console.log(`${movie.name} | rating: ${movie.rating}`);
        showRating(movie);
    });
}

function getScriptWithType(scripts, type) {
    for (let i = 0; i < scripts.length; i++) {
        let script = scripts[i];
        let scriptType = script.getAttribute("type");
        if (scriptType == null) {
            continue;
        }
        if (scriptType == type) {
            return script;
        }
    }
    return null;
}

function getMovieName(rawName) {
    // parse name from raw name and replace . with space
    let movieName = rawName.replace(/\./g, " ");
    // remove left parenthesis and right parenthesis
    movieName = movieName.replace(/[\(\)]/g, "");
    // remove everything after year in the movieName
    let year = movieName.match(/\s\d{4}\s/);
    if (year.length > 0) {
        movieName = movieName.substring(0, year.index + year[0].length);
    }
    movieName = movieName.trim();
    return movieName;
}

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}