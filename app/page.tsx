"use client"

import Image from "next/image"
import styles from "./page.module.css"
import mapboxgl from "!mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useRef, useEffect, useState, createElement } from "react"
import { create } from "domain";


function makeFeature(name, coords, properties) {
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": coords
        },
        "properties": {
            "name": name,
            ...properties
        }
    };
}

function populateData() {
    let data = [];
    var json = require('./data.json');
    json.forEach(function (o) {
        const coords = o.Coordinates.split(',').map(Number).reverse(); // Note: Mapbox expects long,lat
        const feature = makeFeature(
            o.Name,
            coords,
            { "start": o.StartDate, "end": o.EndDate, "dates": o.Dates, "information": o.Information });
        data.push(feature);
    });
    return data;
}

function createPathLayer(pathjson) {
    return {
        "id": `route ${pathjson}`,
        "type": "line",
        "source": {
            "type": "geojson",
            "data": {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "LineString",
                    "coordinates": pathjson
                }
            }
        },
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "#9DE0AD",
            "line-width": 2,
            "line-opacity": 0.8
        }
    };
}

export default function Home() {
  return (
    <main className={styles.main}>
        <Map/>
    </main>
  );
}

function Map() {
    const mapContainer = useRef(null);
    const map = useRef(null);

    const datesContainer = useRef(null);

    const [lng, setLng] = useState(-95);
    const [lat, setLat] = useState(40.1);
    const data = useState(populateData());
    const [currentIndex, setCurrentIndex] = useState(-1);

    const currentPopup = useRef(null);


    function showPopup(feature) {
        const coords = feature.geometry.coordinates;
        const properties = feature.properties;
        const name = properties.name;
        const info = properties.information;
        const dates = properties.dates;
        const start = new Date(properties.start).toDateString();
        const end = new Date(properties.end).toDateString();

        if (currentPopup.current) {
            currentPopup.current.remove();
            currentPopup.current = null;
        }
        const content = `<h2>${name}</h2><br><h4>Dates:</h4> ${start} - ${end}<br><h4>Information:</h4> ${info}`;

        const popup = new mapboxgl.Popup({ closeButton: false })
            .setLngLat(coords)
            .setHTML(content)
            .addTo(map.current);

        currentPopup.current = popup;
    }

    useEffect(() => {
        if (map.current) {
            return; // initialize map only once
        }

        mapboxgl.accessToken = "pk.eyJ1IjoiY2FsZWJ3YW5nIiwiYSI6ImNsa2tseXV3dDB6djIza3A0d2ptbTY4MDgifQ.wn8a4HxeG1MzYcMEEtIdvg";

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/dark-v11",
            center: [lng, lat],
            projection: "mercator",
            zoom: 3.75,
            minZoom: 3.5,
        });

        map.current.on("click", (e) => {
            setLng(e.lngLat.lng);
            setLat(e.lngLat.lat);
        });


        const path1json = require('./path1.json');
        const path2json = require('./path2.json');
        const path3json = require('./path3.json');
        const bishopToSedonaJson = require('./bishopToSedona.json');
        const chattToAshevilleJson = require('./chattToAsheville.json');
        map.current.on("load", () => {
            map.current.addLayer({
                "id": "destinations",
                "type": "circle",
                "source": {
                    "type": "geojson",
                    "data": {"type": "FeatureCollection", "features": data[0]},
                },
                "paint": {
                    "circle-radius": 6,
                    "circle-color": "#00ffff",
                    "circle-opacity": 0.8,
                }
            });

            map.current.addLayer(createPathLayer(path1json));
            map.current.addLayer(createPathLayer(path2json));
            map.current.addLayer(createPathLayer(path3json));
            map.current.addLayer(createPathLayer(bishopToSedonaJson));
            map.current.addLayer(createPathLayer(chattToAshevilleJson)); 
        });

        map.current.on("mouseenter", "destinations", (e) => {
            showPopup(e.features[0]);
        });

        map.current.on("mouseleave", "destinations", (e) => {
            if (currentPopup.current) {
                currentPopup.current.remove();
                currentPopup.current = null;
            }
        });

    });

    return (
        <div className={styles.contents}>
            <div className={styles.mapBar}>
                Longitude: {lng} | Latitude: {lat}
            </div>
            <div ref={mapContainer} className={styles.mapContainer} />
            <div ref={datesContainer} className={styles.datesContainer}>
                {data[0].map((e, i) => <div key={i} onMouseEnter={() => {
                    showPopup(data[0][i]);
                }}>Row {i}: {e.properties.name} </div>)}
            </div>
       </div>
    );
}
