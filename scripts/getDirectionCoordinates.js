const fs = require('fs');

console.log("Running script to generate directions between coordinates in data.json");

const mapboxToken = "pk.eyJ1IjoiY2FsZWJ3YW5nIiwiYSI6ImNsa2tseXV3dDB6djIza3A0d2ptbTY4MDgifQ.wn8a4HxeG1MzYcMEEtIdvg";
const outputDirectory = "../app/paths/";

function formatCoordinatesAsLongLat() {
    let data = [];
    var json = require('../app/data.json');
    json.forEach(function (o) {
        const coords = o.Coordinates.split(',').map(Number).reverse(); // Note: Mapbox expects long,lat
        data.push({coordinates: coords, name: o.Name.replaceAll(' ', '') } );
    });
    return data;
}

var data = formatCoordinatesAsLongLat();

function createTextFile(filename, data) {
  let output = JSON.stringify(data, null, 2);
  fs.writeFile(outputDirectory + filename, output, (err) => {
    if (err) throw err;
    console.log('Data written to file ' + filename);
  });
}

function getTextFileName(index, place1, place2) {
  return "path_" + index + "-" + place1.name + "-" + place2.name + ".json"
}

// for each pair of coordinates, call Path API (or get associated path), create a text file for each. 
async function generatePathsBetweenCoordinates() {
    for (let i = 0; i < data.length - 1; i++) {
	    const place1 = data[i];
	    const place2 = data[i+1];
        const geometry = await getPathCoordinates(place1, place2);
	const fileName = getTextFileName(i, place1, place2);
        createTextFile(fileName, geometry);
    }
}

async function getPathCoordinates(datapoint1, datapoint2) {
    const coords1 = datapoint1.coordinates;
    const coords2 = datapoint2.coordinates;
    const apiCall = "https://api.mapbox.com/directions/v5/mapbox/driving/" +
        `${coords1[0]}%2C${coords1[1]}%3B` +
    `${coords2[0]}%2C${coords2[1]}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${mapboxToken}`

    let response = await fetch(apiCall);
    let result = await response.json();
    return result['routes'][0]['geometry'];
}

var paths = generatePathsBetweenCoordinates();
console.log("" + paths);

console.log("Finished script successfully!");
