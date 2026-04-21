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
loadAllMovies(moviesToCall);

// ************
// functions
// ************

function loadAllMovies(moviesToCall) {
    let groupedMovies = groupBy(moviesToCall, "name");
    for (const key in groupedMovies) {
        var movies = groupedMovies[key];
        console.log(`Loading movie '${key}' with groupped ${movies.length} movies`);
        (originalMovies => getMovieInfo(movies[0]).then(loadedMovie => {
            originalMovies.forEach(domMovie => {
                showRating(loadedMovie, domMovie.iconElement);
            });
        }))(movies);
    };
}

function showRating(movie, iconElement) {
    if (!movie){
        // skip not loaded movies
        return;
    }
    let link = document.createElement("a");
    link.href = `https://www.imdb.com${movie.href}`;
    link.target = "_blank";
    if (movie.imdbName != null) {
        link.title = `${movie.imdbName} on IMDB`;
    }
    insertAfter(link, iconElement);

    let imdb = document.createElement("div");
    if (movie.rating == null) {
        imdb.textContent = `N/A`;
    } else {
        imdb.textContent = `${movie.rating}`;
    }

    // arrows for old rating vs new rating
    if (movie.oldRating != null) {
        const upOrDownArrow = movie.rating > movie.oldRating ? "↑" : "↓";
        const color = movie.rating > movie.oldRating ? "green" : "red";

        let arrowContainer = document.createElement("div");
        arrowContainer.style.float = "right";
        arrowContainer.style.fontSize = "8px";
        arrowContainer.textContent = upOrDownArrow;
        arrowContainer.style.marginLeft = "5px";
        arrowContainer.style.color = color;
        arrowContainer.title = `old rating was: ${movie.oldRating}`;
        imdb.appendChild(arrowContainer);
    }

    let ratingCountPercentage = getOpacityPercentage(movie.ratingCount);
    let alphaColor = getColorFromPercentage(ratingCountPercentage);

    let boxColorObj = getColorBasedOnGenre(movie.genres, ratingCountPercentage, alphaColor);

    imdb.style.background = `${boxColorObj.background}`;
    imdb.style.border = "1px solid black";
    imdb.style.padding = "5px";
    imdb.style.marginRight = "5px";
    imdb.style.borderRadius = "3px";
    imdb.style.fontSize = "12px";
    imdb.style.color = boxColorObj.color;
    imdb.style.textAlign = "center";
    imdb.style.verticalAlign = "middle";
    imdb.style.lineHeight = "3px";
    imdb.style.fontWeight = "bold";
    imdb.style.float = "left";
    link.appendChild(imdb);

    // show rating count or release date
    let ratingCountString = "";
    if (movie.ratingCount > 0) {
        ratingCountString = `${movie.ratingCount} v.`;
    } else {
        let releaseDateString = "";
        if (movie.releaseDate != null){
            let date = new Date(movie.releaseDate);
            if (date > new Date()) {
                releaseDateString = `release: ${movie.releaseDate}`;
            }
            ratingCountString = releaseDateString;
        }
    }

    if (ratingCountString != "") {
        let votesContainer = document.createElement("div");
        votesContainer.style.float = "right";
        votesContainer.style.fontSize = "5px";
        votesContainer.textContent = ratingCountString;
        votesContainer.style.marginLeft = "5px";
        imdb.appendChild(votesContainer);
    }
}

function getColorBasedOnGenre(genres, alphaPercentage, alpha2LetterHexColor) {
    var orangeBg = "#F5C518";
    let color = {
        background: `${orangeBg}${alpha2LetterHexColor}`,
        color: getTextColorBasedOnBackgroundColor(orangeBg, alphaPercentage)
    };
    if (!genres){
        return color;
    }

    if (genres.includes("Horror")) {
        darkPurpleBg = "#674EA7";
        var horrorPercentage = 1 / genres.length * 100;
        color = {
            background: `linear-gradient(90deg, ${darkPurpleBg}${alpha2LetterHexColor} ${horrorPercentage}%, ${orangeBg}${alpha2LetterHexColor} ${horrorPercentage}%)`,
            color: getTextColorBasedOnBackgroundColor(darkPurpleBg, alphaPercentage)
        }
    }
    return color;
}

function getTextColorBasedOnBackgroundColor(backgroundColor, alphaPercentage) {
    if (alphaPercentage == null) {
        alphaPercentage = 100;
    }
    let color = "black";
    let rgb = hexToRgb(backgroundColor);
    let brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    if (brightness < 100 * alphaPercentage/100) {
        color = "white";
    }
    return color;
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
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
    // //in case you need to debug some specific movie:
    // if (movie.name.toLowerCase().indexOf("ash".toLowerCase()) >= 0) {
    //     return getMovieInfoFromIMDB(movie);
    // }
    // return Promise.resolve();
    return readLocalStorage(movie.name).then(cachedItem => {
        if (cachedItem !== undefined) {
            // in case the timestamp is older than 1 day remove the movie from the cache
            let now = Date.now();
            let oneDayInMs = 24 * 60 * 60 * 1000;
            //let minutes5inMs = 5 * 60 * 1000;
            let diff = now - cachedItem.timestamp;
            if (isNaN(diff) || diff > oneDayInMs) {
                //console.log(`Updating movie ${movie.name} in cache...`);
                const oldMovie = cachedItem.movie;
                chrome.storage.local.remove(movie.name);
                return getMovieInfoFromIMDB(movie)
                    .then(m => {
                        // in case the rating value changed, update the local storage
                        updateMovieInLocalStorage(m, oldMovie);
                        return m;
                    });
            } else {
                // merge the local storage movie object with current one, to have the actual iconElement from DOM
                let mergedMovie = Object.assign(cachedItem.movie, movie);
                return mergedMovie;
            }
        }
    },
    () => {
        // if the movie is not in the cache, get the movie info from imdb
        return getMovieInfoFromIMDB(movie);
    });
}

function updateMovieInLocalStorage(newMovie, oldMovie) {
    let hasChanges = false;
    if (oldMovie.rating !== newMovie.rating) {
        newMovie.oldRating = oldMovie.rating;
        hasChanges = true;
    }

    if (oldMovie.ratingCount !== newMovie.ratingCount) {
        newMovie.oldRatingCount = oldMovie.ratingCount;
        hasChanges = true;
    }

    if (hasChanges) {
        console.log(`Updating changed rating for the movie ${newMovie.name}`);
        chrome.storage.local.set({
            [newMovie.name]: {
                movie: newMovie,
                timestamp: Date.now()
            }
        });
    }
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
    .then(responseText => {
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error(`Failed to parse findMovie response for movie '${movie.name}'`);
            return;
        }

        let results = data.d;
        if (!results || results.length == 0) {
            console.error(`no results for movie '${movie.name}'.`);
            return;
        }

        // Filter to movies and TV shows (matching the old ttype=ft&ttype=tv filter)
        let filtered = results.filter(r => r.qid === "movie" || r.qid === "tvSeries" || r.qid === "tvMiniSeries");
        if (filtered.length == 0) {
            filtered = results;
        }

        let bestMatch = findBestSuggestionMatch(filtered, movie, 0.75);
        if (bestMatch == null) {
            bestMatch = findBestSuggestionMatch(filtered, movie, 0.5);
        }
        if (bestMatch == null && filtered.length > 0) {
            bestMatch = filtered[0];
        }

        if (bestMatch == null) {
            console.error(`couldn't find any matching results for movie '${movie.name}'`);
            return;
        }

        let id = bestMatch.id;
        movie.id = id;
        movie.href = `/title/${id}/`;
        movie.imdbName = getMovieName(bestMatch.l);
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
        .then(responseText => {
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error(`Failed to parse getMovie response for movie '${movie.name}'`);
                return;
            }

            let titleData = data?.data?.title;
            if (titleData == null) {
                console.error(`No title data returned for movie '${movie.name}'`);
                return;
            }

            if (titleData.ratingsSummary?.aggregateRating != null) {
                movie.rating = titleData.ratingsSummary.aggregateRating;
                movie.ratingCount = titleData.ratingsSummary.voteCount;
            } else {
                movie.rating = null;
                movie.ratingCount = null;

                // try to get the release date
                let rd = titleData.releaseDate;
                if (rd != null) {
                    movie.releaseDate = `${rd.year}-${String(rd.month).padStart(2, '0')}-${String(rd.day).padStart(2, '0')}`;
                }
            }

            // get genres
            let genreList = titleData.titleGenres?.genres;
            if (genreList != null && genreList.length > 0) {
                let genres = genreList.map(g => g.genre.text);
                console.log(`genres for movie ${movie.imdbName}: ${genres}`);
                movie.genres = genres;
            }

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

        console.log(`Saved: ${movie.name} | rating: ${movie.rating}`);
        return movie;
    });
}

function getAElementFromLink(link){
    let aElements = link.getElementsByTagName("a");
    if (aElements.length == 0) {
        return null;
    }

    for (let j = 0; j < aElements.length; j++) {
        const aElement = aElements[j];
        if (aElement.textContent == ""){
            continue;
        }

        return aElement;
    }

    return null;
}

function getMovieNameWithoutYear(movieName){
    // check if year is in valid ranges
    let year = movieName.match(/\d{4}/);
    if (year != null) {
        yearNum = parseInt(year[0]);
        // remove year if valid
        if (yearNum != NaN && yearNum >= 1900 && yearNum <= 2100) {
            movieName = movieName.replace(yearNum, "");
        }
    }
    return movieName.trim();
}


function findLinkWithFuzziness(links, movie, fuzzyValue){
    let a = null;
    let fuzzyMatches = [];
    let i = 0;
    for (i = 0; i < links.length; i++) {
        const link = links[i];

        const aElement = getAElementFromLink(link);
        if (aElement == null) {
            continue;
        }

        const linkMovieName = getMovieName(aElement.textContent);
        const currentMovieNameWithoutYear = getMovieNameWithoutYear(movie.name);
        const val = fuzzyMatch(linkMovieName, currentMovieNameWithoutYear);
        if (val >= fuzzyValue) {
            fuzzyMatches.push({
                value: val,
                a: aElement,
                linkMovieName: linkMovieName,
                position: i
            });
        }

        const maxLinksToCheck = 25;
        if (i > maxLinksToCheck){
            if (fuzzyMatches.length == 0){
                console.log(`skipping more than ${maxLinksToCheck} links for movie '${movie.name}' with no matches.`);
            }
            break;
        }
    }

    if (fuzzyMatches.length){
        fuzzyMatches.sort((a, b) => b.value - a.value);
        const match = fuzzyMatches[0];
        a = match.a;
        console.log(`found a match (${match.linkMovieName}) with score ${match.value} for movie '${movie.name}' on the ${match.position} position (out of ${links.length} and ${fuzzyMatches.length} matches)`);
    }

    return a;
}

function findBestSuggestionMatch(results, movie, fuzzyValue) {
    let bestMatch = null;
    let bestScore = -1;
    const currentMovieNameWithoutYear = getMovieNameWithoutYear(movie.name);

    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const resultName = getMovieName(result.l);
        const score = fuzzyMatch(resultName, currentMovieNameWithoutYear);
        if (score >= fuzzyValue && score > bestScore) {
            bestScore = score;
            bestMatch = result;
        }
    }

    return bestMatch;
}

function getLinkToImdbText(movieName) {
    return `Try to call it yourself: https://www.imdb.com/find?q=${movieName.replace(/\s/g, "%20")}&s=tt&ttype=ft&ttype=tv&ref_=fn_ft&count=3`;
}

function fuzzyMatch(str1, str2, fuzzyValue) {
    const val = fuzzyMatch(str1, str2, fuzzyValue);
    if (val >= fuzzyValue) {
        return true;
    }
    return false;
}

function fuzzyMatch(str1, str2) {
    let results = FuzzySet([str1]).get(str2);
    if (results == null){
        return -1;
    }

    let [result] = results;
    if (result.length > 1){
        return result[0];
    }
    return -1;
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
    if (year != null && year.length > 0) {
        // check if year is valid
        let yearStr = year[0].trim();
        let yearNum = parseInt(yearStr);
        if (yearNum != NaN && yearNum > 1920 && yearNum < 2100) {
            movieName = movieName.substring(0, year.index + year[0].length);
        }
    }
    // remove everyting in between square brackets
    movieName = movieName.replace(/\[.*\]/g, "");

    // remove apostrophe surrounding a word
    movieName = movieName.replace(/\s'(\w+)'/g, " $1");

    movieName = movieName.trim();
    return movieName;
}

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}