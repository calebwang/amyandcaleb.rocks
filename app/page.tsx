"use client"

import Image from "next/image"
import styles from "./page.module.css"
import mapboxgl, { Layer, Projection, LineLayout, LineLayer } from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useRef, useEffect, useState, createElement, MutableRefObject, RefObject } from "react"
import { create } from "domain";
import { FeatureCollection, Feature, Point, Geometry, GeoJsonProperties } from "geojson";


const mapboxToken = "pk.eyJ1IjoiY2FsZWJ3YW5nIiwiYSI6ImNsa2tseXV3dDB6djIza3A0d2ptbTY4MDgifQ.wn8a4HxeG1MzYcMEEtIdvg";

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

function makeFeature(name: string, coords: number[], properties: object) : Feature {
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

type Waypoint = {
    StartDate: string,
    EndDate: string,
    Dates: string,
    Name: string,
    Information: string,
    Coordinates: string
}

function populateData() : Feature[] {
    let data : Feature[] = [];
    var json = require('./data.json');
    json.forEach(function (o: Waypoint) {
        const coords = o.Coordinates.split(',').map(Number).reverse(); // Note: Mapbox expects long,lat
        const feature = makeFeature(
            o.Name,
            coords,
            { "start": o.StartDate, "end": o.EndDate, "dates": o.Dates, "information": o.Information });
        data.push(feature);
    });
    return data;
}

function createPathLayer(geometry: Geometry, color: string) : LineLayer {
    return {
        "id": `route ${color}`,
        "type": "line",
        "source": {
            "type": "geojson",
            "data": {
                "type": "Feature",
                "properties": {},
                "geometry": geometry
            }
        },
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        } as LineLayout,
        "paint": {
            "line-color": color,
            "line-width": 2,
            "line-opacity": 0.8
        }
    };
}

type Color = {
    r: number;
    g: number;
    b: number;
    a: number;
}

function colorStyle(color: Color, overrides: Partial<Color> = {}): string {
    return `rgba(${overrides.r ?? color.r}, ${overrides.g ?? color.g}, ${overrides.b ?? color.b}, ${overrides.a ?? color.a})`;
}

function createColors(numColors: number) : Color[] {
    const output : string[] = [];
    //const color1Rgb = [69, 173, 168]; //greenBlue
    ////const color1Rgb = [30, 63, 69]; // darkBlue
    //const color1Rgb = [13, 229, 218];
    //const color2Rgb = [229, 252, 194]; // lightGreen
    const color2Rgb = [230, 0, 35];
    const color1Rgb = [35, 0, 235];
    const redDiff = (color2Rgb[0] - color1Rgb[0]) / numColors;
    const greenDiff = (color2Rgb[1] - color1Rgb[1]) / numColors;
    const blueDiff = (color2Rgb[2] - color1Rgb[2]) / numColors;
    for (let i = 0; i < numColors; i++) {
        output.push({
            r: Math.floor(color1Rgb[0] + redDiff * i),
            g: Math.floor(color1Rgb[1] + greenDiff * i),
            b: Math.floor(color1Rgb[2] + blueDiff * i),
            a: 1
        });
    }
    return output;
}


// for each pair of coordinates, call Path API (or get associated path), create and add path layer
async function generatePathsBetweenCoordinates(colors: Color[]) {
    const pathLayers : LineLayer[] = [];
    for (let i = 0; i < data.length - 1; i++) {
        const geometry = await getPathCoordinates(data[i], data[i + 1]);
        pathLayers.push(createPathLayer(geometry, colorStyle(colors[i])));
    }
    return pathLayers;
}

async function getPathCoordinates(datapoint1: Feature, datapoint2: Feature) {
    const coords1 = (datapoint1.geometry as Point).coordinates;
    const coords2 = (datapoint2.geometry as Point).coordinates;
    const apiCall = "https://api.mapbox.com/directions/v5/mapbox/driving/" +
        `${coords1[0]}%2C${coords1[1]}%3B` +
    `${coords2[0]}%2C${coords2[1]}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${mapboxToken}`

    let response = await fetch(apiCall);
    let result = await response.json();
    return result['routes'][0]['geometry'];
}

const data = populateData();
const colors = createColors(data.length);
const paths = generatePathsBetweenCoordinates(colors);

export default function Home() {
    return (
        <main className={styles.main}>
            <Map />
        </main>
    );
}

function Map() {
    const mapContainer: MutableRefObject<HTMLDivElement | null> = useRef(null);
    const map : MutableRefObject<mapboxgl.Map | null> = useRef(null);

    const [lng, setLng] = useState(-95);
    const [lat, setLat] = useState(40.1);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [currentPopupLocation, setCurrentPopupLocation] = useState<Feature | null>(null);

    const currentPopup = useRef<mapboxgl.Popup | null >(null);

    useEffect(() => {
        if (map.current) {
            return; // initialize map only once
        }

        mapboxgl.accessToken = mapboxToken;

        if (!mapContainer.current) {
            return;
        }
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/dark-v11",
            center: [lng, lat],
            projection: { name: "mercator" } as Projection,
            zoom: 3.75,
            minZoom: 3.5,
        });

        map.current.on("click", (e) => {
            setLng(e.lngLat.lng);
            setLat(e.lngLat.lat);
        });


        map.current.on("load", () => {
            if (!map.current) {
                return;
            }
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

            paths.then(values => values.forEach(layer => {
                if (!map.current) {
                    return;
                }
                map.current.addLayer(layer);
            }));

        });

        map.current.on("mouseenter", "destinations", (e) => {
            if (!e.features) {
                return;
            }
            setCurrentPopupLocation(e.features[0]);
        });

        map.current.on("mouseleave", "destinations", (e) => {
            setCurrentPopupLocation(null);
        });

    });

    function showPopup(feature: Feature) {
        if (!map.current) {
            return;
        }
        const coords: [number, number] = (feature.geometry as Point).coordinates as [number, number];
        const properties = feature.properties;
        const name = properties?.name;
        const info = properties?.information;
        const dates = properties?.dates;
        const startDateStr = new Date(properties?.start).toLocaleString("en-US", { month: "long", day: "numeric", "year": "numeric" });
        const endDateStr = new Date(properties?.end).toLocaleString("en-US", { month: "long", day: "numeric", "year": "numeric" });

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
                            if (!e.properties) {
                                return;
                            }
                            const isHovered = currentPopupLocation?.id === e.id;
                            return <div
                                key={i}
                                className={ styles.dateSection + (isHovered ? ` ${styles["dateSection--hovered"]}` : "") }
                                style={{
                                    "flex": new Date(e.properties.end).getTime() - new Date(e.properties.start).getTime(),
                                    "backgroundColor": colorStyle(colors[i], { a: isHovered ? 0.7 : 1 })
                                }}
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
