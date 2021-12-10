// get first element with class "featured-list"
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
        console.error("icon node is missing");
        continue;
    }

    let imdb = document.createElement("div");
    imdb.innerHTML = `<a href="https://www.imdb.com/find?q=${moveieName}" target="_blank">IMDB</a>`;
    insertAfter(imdb, icon);
}
document.body.style.backgroundColor = 'orange';

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}