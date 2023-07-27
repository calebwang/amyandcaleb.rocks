"use client"

import Image from "next/image"
import styles from "./page.module.css"
import mapboxgl from "!mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useRef, useEffect, useState } from "react"
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
    let string = '';
    json.forEach(function (o) {
        const coords = o.Coordinates.split(',').map(Number).reverse(); // Note: Mapbox expects long,lat
        const feature = makeFeature(o.Name, coords, { "dates": o.Dates, "information": o.Information });
        data.push(feature);
        string = string.concat(coords).concat(';');
    });
    console.log(string);
    return data;
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
    const [lng, setLng] = useState(-95);
    const [lat, setLat] = useState(40.1);

    const currentPopup = useRef(null);

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

        const data = populateData();

        const pathjson = require('./path1.json');
        map.current.on("load", () => {
            map.current.addLayer({
                "id": "destinations",
                "type": "circle",
                "source": {
                    "type": "geojson",
                    "data": {"type": "FeatureCollection", "features": data},
                },
                "paint": {
                    "circle-radius": 7,
                    "circle-color": "#00ffff",
                    "circle-opacity": 0.8,
                }
            });

            map.current.addLayer({
                "id": "route",
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
                    "line-opacity": 0.8
                }
            }); 
        });

        map.current.on("mouseenter", "destinations", (e) => {
            const coords = e.features[0].geometry.coordinates;
            const properties = e.features[0].properties;
            const name = properties.name;
            const info = properties.information;
            const dates = properties.dates;

            if (currentPopup.current) {
                currentPopup.current.remove();
                currentPopup.current = null;
            }
            const content = `<h2>${name}</h2><br><h4>Dates:</h4> ${dates}<br><h4>Information:</h4> ${info}`;

            const popup = new mapboxgl.Popup({ closeButton: false })
                .setLngLat(coords)
                .setHTML(content)
                .addTo(map.current);

            currentPopup.current = popup;
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
            <div ref={mapContainer} className={styles.mapContainer}/>
       </div>
    );
}
