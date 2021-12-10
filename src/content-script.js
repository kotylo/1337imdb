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

    // temp testing 1 item
    break;
}
document.body.style.backgroundColor = 'orange';

Promise.all(moviesToCall.map(m => getMovieInfo(m)))
.then(m => {
    console.log(`${m.name} | rating: ${m.rating}`);
    showRating(m);
});

const promiseTimeout = time => () => new Promise(resolve => setTimeout(resolve, time));

function showRating(movie) {
    let imdb = document.createElement("div");
    imdb.textContent = `${movie.rating}`;

    imdb.style.backgroundColor = 'yellow';
    imdb.style.border = '1px solid black';
    imdb.style.padding = '5px';
    imdb.style.margin = '5px';
    imdb.style.borderRadius = '5px';
    imdb.style.fontSize = '20px';
    imdb.style.color = 'black';
    imdb.style.textAlign = 'center';
    imdb.style.verticalAlign = 'middle';
    imdb.style.lineHeight = '20px';
    imdb.style.fontWeight = 'bold';
    imdb.style.textShadow = '1px 1px 1px black';
    imdb.style.boxShadow = '1px 1px 1px black';
    imdb.style.backgroundImage = 'none';
    imdb.style.backgroundColor = 'yellow';
    imdb.style.backgroundRepeat = 'no-repeat';
    imdb.style.backgroundPosition = 'center';
    imdb.style.backgroundSize = 'contain';

    insertAfter(imdb, m.iconElement);
}

function getMovieInfo(movie) {

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({movie: movie}, response => {
            console.log(response.result);
            if(response.result) {
                resolve();
            } else {
                reject("Something went wrong with receiving the fetch response from background.js");
            }
        });
    });

    // chrome.runtime.sendMessage({movie: movie}, response =>{
    //     console.log(response.result);
    // });
}

function getMovieName(rawName) {
    // parse name from raw name and replace . with space
    let movieName = rawName.replace(/\./g, " ");
    // remove everything after year in the movieName
    let year = movieName.match(/\s\d{4}\s/);
    if (year != null) {
        movieName = movieName.substring(0, year.index + year.length);
    }
    return movieName;
}

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}