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

    // temp testing limited items
    // if (i > 5){
    //     break;
    // }
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
    // in case you need to debug some specific movie:
    // if (movie.name.indexOf(" Son") > 0) {
    //     return getMovieInfoFromIMDB(movie);
    // }
    // return;
    return readLocalStorage(movie.name).then(value => {
        if (value !== undefined) {
            // merge current movie object with the local storage one, to have the actual iconElement from DOM
            let mergedMovie = Object.assign(value.movie, movie);

            showRating(mergedMovie);

            // in case the timestamp is older than 1 day remove the movie from the cache
            let now = new Date();
            let oneDay = 24 * 60 * 60 * 1000;
            let diff = now - value.timestamp;
            if (diff > oneDay) {
                chrome.storage.local.remove(movie.name);
            }
            return;
        }
    },
    () => {
        // if the movie is not in the cache, get the movie info from imdb
        return getMovieInfoFromIMDB(movie);
    });
}

async function readLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (result[key] === undefined) {
                reject();
            } else {
                resolve(result[key]);
            }
        });
    });
};

function getMovieInfoFromIMDB(movie) {
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
        let links = doc.getElementsByClassName("findResult");
        if (links.length == 0) {
            console.error(`no links for movie '${movie.name}'. ${getLinkToImdbText(movie.name)}`);
            return;
        }

        let a = null;
        for (let i = 0; i < links.length; i++) {
            let link = links[i];
            let aElements = link.getElementsByTagName("a");

            for (let j = 0; j < aElements.length; j++) {
                let aElement = aElements[j];
                if (aElement.textContent == ""){
                    continue;
                }

                var linkMovieName = getMovieName(link.textContent);
                if (fuzzyMatch(linkMovieName, movie.name)) {
                    a = aElement;
                    break;
                }
            }

            if (a != null) {
                break;
            }
        }

        if (a == null){
            console.error(`couldn't find any matching links. Try investigating this link: ${getLinkToImdbText(movie.name)}`);
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

        chrome.storage.local.set({
            [movie.name]: {
                movie: movie,
                timestamp: Date.now()
            }
        });

        console.log(`${movie.name} | rating: ${movie.rating}`);
        showRating(movie);
    });
}

function getLinkToImdbText(movieName) {
    return `Try to call it yourself: https://www.imdb.com/find?q=${movieName.replace(/\s/g, "%20")}&s=tt&ttype=ft&ref_=fn_ft&count=3`;
}

function fuzzyMatch(str1, str2) {
    let str1Lower = str1.toLowerCase();
    let str2Lower = str2.toLowerCase();
    let str1Length = str1.length;
    let str2Length = str2.length;

    let maxLength = str1Length > str2Length ? str1Length : str2Length;

    let count = 0;
    for (let i = 0; i < maxLength; i++) {
        let char1 = str1Lower[i];
        let char2 = str2Lower[i];
        if (char1 == char2) {
            count++;
        }
    }

    return count / maxLength > 0.7;
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