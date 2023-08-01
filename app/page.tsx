"use client"

import Image from "next/image"
import styles from "./page.module.css"
import mapboxgl from "!mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useRef, useEffect, useState, createElement } from "react"
import { create } from "domain";

function generateTimelineDates() {
    const TOTAL_NUM_MONTHS = 13;
    const startDate = new Date(2023, 8, 1);
    const dates = [startDate];
    for (let i = 1; i < TOTAL_NUM_MONTHS - 1; i++) {
        const newDate = new Date(startDate);
        newDate.setMonth(startDate.getMonth() + i);
        dates.push(newDate);
    }
    return dates;
}

const timelineDates = generateTimelineDates();

let id = 0;

function makeFeature(name, coords, properties) {
    return {
        "id": id++,
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

// returns an array of strings of the format ["rgb(255, 255, 0)", "rgb(255, 255, 0)"]
function createColors(numColors) {
    const output = [];
    const color1Rgb = [69, 173, 168]; //greenBlue
    const color2Rgb = [229, 252, 194]; // lightGreen
    const redDiff = (color2Rgb[0] - color1Rgb[0]) / numColors;
    const greenDiff = (color2Rgb[1] - color1Rgb[1]) / numColors;
    const blueDiff = (color2Rgb[2] - color1Rgb[2]) / numColors;
    for (let i = 0; i < numColors; i++) {
        output.push(`rgb(${Math.floor(color1Rgb[0] + redDiff * i)}, ${Math.floor(color1Rgb[1] + greenDiff * i)}, ${Math.floor(color1Rgb[2] + blueDiff * i)})`);
    }
    return output;
}

const data = populateData();

export default function Home() {
    return (
        <main className={styles.main}>
            <Map />
        </main>
    );
}

function Map() {
    const mapContainer = useRef(null);
    const map = useRef(null);

    const [lng, setLng] = useState(-95);
    const [lat, setLat] = useState(40.1);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [currentPopupLocation, setCurrentPopupLocation] = useState(null);

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
                    "data": { "type": "FeatureCollection", "features": data },
                },
                "paint": {
                    "circle-radius": 6,
                    "circle-color": "#00ffff",
                    "circle-opacity": 0.8,
                }
            });

            console.log(createColors(data.length));

            map.current.addLayer(createPathLayer(path1json));
            map.current.addLayer(createPathLayer(path2json));
            map.current.addLayer(createPathLayer(path3json));
            map.current.addLayer(createPathLayer(bishopToSedonaJson));
            map.current.addLayer(createPathLayer(chattToAshevilleJson));
        });

        map.current.on("mouseenter", "destinations", (e) => {
            setCurrentPopupLocation(e.features[0]);
        });

        map.current.on("mouseleave", "destinations", (e) => {
            setCurrentPopupLocation(null);
        });

    });

    function showPopup(feature) {
        const coords = feature.geometry.coordinates;
        const properties = feature.properties;
        const name = properties.name;
        const info = properties.information;
        const dates = properties.dates;
        const startDateStr = new Date(properties.start).toLocaleString("en-US", { month: "long", day: "numeric", "year": "numeric" });
        const endDateStr = new Date(properties.end).toLocaleString("en-US", { month: "long", day: "numeric", "year": "numeric" });

        if (currentPopup.current) {
            currentPopup.current.remove();
            currentPopup.current = null;
        }
        const content = `<h2>${name}</h2>${startDateStr} - ${endDateStr}`;

        const popup = new mapboxgl.Popup({ closeButton: false })
            .setLngLat(coords)
            .setHTML(content)
            .addTo(map.current);

        currentPopup.current = popup;
    }

    function clearPopup() {
        if (currentPopup.current) {
            currentPopup.current.remove();
            currentPopup.current = null;
        }
    }

    useEffect(() => {
        if (currentPopupLocation) {
            showPopup(currentPopupLocation);
        } else {
            clearPopup();
        }
    });



    return (
        <div className={styles.contents}>
            <div className={styles.mapBar}>
                Longitude: {lng} | Latitude: {lat}
            </div>
            <div ref={mapContainer} className={styles.mapContainer} />
            <div className={styles.timelineSection}>
                <div className={styles.datesContainer}>
                    {
                        data.map((e, i) => {
                            return <div
                                key={i}
                                className={styles.dateSection + (currentPopupLocation?.id === e.id ? ` ${styles["dateSection--hovered"]}` : "")}
                                style={{ "flex": new Date(e.properties.end).getTime() - new Date(e.properties.start).getTime() }}
                                onMouseEnter={() => setCurrentPopupLocation(data[i])}
                                onMouseLeave={() => setCurrentPopupLocation(null)}
                            />
                        })

                    }
                </div>
                <div className={styles.dateLabels}>
                    {
                        timelineDates.slice(1).map((d, i) =>
                            <div
                                key={i}
                                className={styles.timelineMonthSection}
                                style={{ "flex": d.getTime() - timelineDates[i].getTime() }}
                            >
                                {timelineDates[i].toLocaleString("en-US", { month: "long" })}
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}
