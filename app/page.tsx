"use client"

import { isMobile } from "react-device-detect";
import styles from "./page.module.css"
import mapboxgl, { Projection, LineLayout, LineLayer, PointLike } from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useRef, useEffect, useState,  MutableRefObject } from "react"
import { Feature, Point, Position, Geometry } from "geojson";

const mapboxToken = "pk.eyJ1IjoiY2FsZWJ3YW5nIiwiYSI6ImNsa2tseXV3dDB6djIza3A0d2ptbTY4MDgifQ.wn8a4HxeG1MzYcMEEtIdvg";


type FeatureProperties = {
    name: string;
    startDateStr: string;
    endDateStr: string;
    dateDescription: string;
    information: string;
    mproject: string; 
}
type MapFeature = Feature<Point, FeatureProperties>;

let id = 0;
function makeFeature(name: string, coords: Position, properties: Omit<FeatureProperties, "name">): MapFeature {
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
    MountainProject: string,
    Information: string,
    Coordinates: string
}

function populateData() : MapFeature[] {
    let data : MapFeature[] = [];
    var json = require('./data.json');
    json.forEach(function (o: Waypoint) {
        const coords = o.Coordinates.split(',').map(Number).reverse(); // Note: Mapbox expects long,lat
        const feature = makeFeature(
            o.Name,
            coords,
            { "startDateStr": o.StartDate, "endDateStr": o.EndDate, "dateDescription": o.Dates, "information": o.Information, "mproject": o.MountainProject });
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
    const output : Color[] = [];
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

function readPaths(data: Feature[], colors: Color[]) {
    const pathLayers: LineLayer[] = [];
    for (let i = 0; i < data.length - 1; i++) {
        const geometry = require(`./paths/path_${i}.json`);
        pathLayers.push(createPathLayer(geometry, colorStyle(colors[i])));
    }
    return pathLayers;
}

function calculateZoomLevel(): number {
    if (window.innerWidth <= 768) { // Mobile
        return 2;
    } else if (window.innerWidth < 1024) { // Tablets
        return 3;
    }
    return 3.75;
}

function calculateStartCoords(): [number, number] {
    if (window.innerWidth <= 768) { // Mobile
        return [-98, 34];
    } else if (window.innerWidth < 1024) { // Tablets
        return [-87.6, 30.1];
    }
    return [-96,40.1];
}

function generateTimelineDateSegments(): [string, Date][] {
    const screenWidth = window.screen.width;
    const TOTAL_NUM_MONTHS = 12;
    const maxSegments = Math.floor(screenWidth / 120);
    const numSegments = [2, 4, 12].findLast(n => n <= maxSegments) || 12;
    const startDate = new Date(2023, 9, 1);
    const endDate = new Date(2024, 8, 1);

    if (numSegments === 2) {
        const jan2024 = new Date(2024, 0, 1);
        return [
            ["Oct '23", startDate],
            ["Jan '24", jan2024],
            ["Sep '24", endDate]
        ];
    }

    const segments: [string, Date][] = [];
    for (let i = 0; i < numSegments; i++) { const newDate = new Date(startDate);
        newDate.setMonth(startDate.getMonth() + i * Math.floor(TOTAL_NUM_MONTHS / numSegments));
        const monthStr = newDate.toLocaleString("en-US", { month: "long" });
        const label: string = (segments.length === 0 || newDate.getFullYear() !== segments[segments.length - 1][1].getFullYear())
            ? `${monthStr} '${newDate.toLocaleString("en-US", { year: "2-digit" })}`
            : monthStr;
        segments.push([label, newDate]);
    }
    return segments;
}


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

    const [data, setData] = useState<MapFeature[] | null>(null);
    const [colors, setColors] = useState<Color[] | null>(null);
    const [paths, setPaths] = useState<LineLayer[] | null>(null);

    const [timelineDates, setTimelineDates] = useState<[string, Date][] | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [lat, setLat] = useState<number | null>(null);

    const [mapReady, setMapReady] = useState(false);

    useEffect(() => {
        if (data) return;
        (async () => {
            setData(await populateData());
        })();
    }, [data]);

    useEffect(() => {
        if (!data) return;
        if (colors) return;
        setColors(createColors(data.length));
    }, [data, colors]);

    useEffect(() => {
        if (!data) return;
        if (!colors) return;
        if (paths) return;
        (async () => {
            setPaths(await readPaths(data, colors));
        })();
    }, [data, colors, paths]);


    useEffect(() => {
        if (timelineDates) return;
        setTimelineDates(generateTimelineDateSegments());
    }, [timelineDates]);

    const [currentPopupLocation, setCurrentPopupLocation] = useState<MapFeature | null>(null);

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
            center: calculateStartCoords(),
            projection: { name: "mercator" } as Projection,
            zoom: calculateZoomLevel(),
            minZoom: 2.25,
        });

        map.current.on("load", () => {
            setMapReady(true);
        });

        map.current.on("click", (e: any) => {
            setLng(e.lngLat.lng);
            setLat(e.lngLat.lat);
        });
    });

    useEffect(() => {
        if (!data) return;
        if (!map.current) return;
        if (!mapReady) return;

        const now = new Date();
        const currentLocation = data.find(e => new Date(e.properties.startDateStr) < now && new Date(e.properties.endDateStr) > now);

        const layers = ["destinations"];
        map.current.addLayer({
            "id": "destinations",
            "type": "circle",
            "source": {
                "type": "geojson",
                "data": { "type": "FeatureCollection", "features": data.filter(v => v !== currentLocation) },
            },
            "paint": {
                "circle-radius": 6,
                "circle-color": "#00ffff",
                "circle-opacity": 0.8,
            }
        });

        if (currentLocation) {
            map.current.loadImage("/we-are-here-icon.png", (err, img) => {
                if (err) return;
                if (!img) return;

                if (!map.current?.hasImage("currentLocationMarker")) {
                    map.current?.addImage("currentLocationMarker", img);
                }

                map.current?.addLayer({
                    id: "currentLocation",
                    type: "symbol",
                    source: {
                        type: "geojson",
                        data: { type: "FeatureCollection", features: [currentLocation] }
                    },
                    layout: {
                        "icon-size": 0.35,
                        "icon-image": "currentLocationMarker",
                    }
                })
            });
            layers.push("currentLocation");
        }


        map.current.on("mouseenter", layers, (e) => {
            if (!e.features) {
                return;
            }
            setCurrentPopupLocation(e.features[0]as any as MapFeature);
        });

        map.current.on("click", e => {
            const bbox: [PointLike, PointLike] = [
                [e.point.x - 5, e.point.y - 5],
                [e.point.x + 5, e.point.y + 5]
            ];
            const features = map.current?.queryRenderedFeatures(bbox, { layers });
            if (!features) return;
            setCurrentPopupLocation(features[0] as any as MapFeature);
        });
    }, [data, map, mapReady]);

    useEffect(() => {
        if (!data || !paths) return;
        if (!map.current) return;
        if (!mapReady) return;

        paths.forEach(layer => {
            if (!map.current) {
                return;
            }
            map.current?.addLayer(layer);
        });

    }, [data, paths, map, mapReady]);

    function formatDatesStr(dateStr1: string, dateStr2: string) : string {
        const startDateStr = new Date(dateStr1).toLocaleString("en-US", { month: "long", day: "numeric", "year": "numeric", timeZone: "UTC" });
        const endDateStr = new Date(dateStr2).toLocaleString("en-US", { month: "long", day: "numeric", "year": "numeric", timeZone: "UTC" });

        return `${startDateStr} - ${endDateStr}`;
    }

    function showPopup(feature: MapFeature) {
        if (!map.current) {
            return;
        }
        const coords: [number, number] = (feature.geometry as Point).coordinates as [number, number];
        const properties = feature.properties;
        const name = properties.name;
        const info = properties.information;
        const dates = properties.dateDescription;
        const mproject = properties.mproject;

        if (currentPopup.current) {
            currentPopup.current.remove();
            currentPopup.current = null;
        }
        var content = `<h2>${name}</h2>${formatDatesStr(properties.startDateStr, properties.endDateStr)}`; 
        if (mproject !== "") {
            content += `<br><a href=${mproject} tabindex="-1">Mountain Project link</a>`;
        }

        const popup = new mapboxgl.Popup({ closeButton: false, focusAfterOpen: false })
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
    }, [currentPopupLocation]);


    function renderTimelineBar() {
        function onTimelineSegmentMouseEnter(feature: MapFeature) {
            setCurrentPopupLocation(feature);
        }

        function onTimelineSegmentClick(feature: MapFeature) {
            setCurrentPopupLocation(feature);

            // Pan to destination.
            if (map.current) {
                map.current.flyTo({
                    center: (feature.geometry as Point).coordinates as [number, number],
                    duration: 500,
                    essential: true // this animation is considered essential with respect to prefers-reduced-motion
                });
            }
        }


        return <div className={styles.timelineBar}>
            {
                data && colors && paths
                    ? data.map((e, i) => {
                        if (!e.properties) {
                            return;
                        }
                        const isHovered = currentPopupLocation?.id === e.id;
                        return <div
                            key = {i}
                            className = { styles.timelineBarSection + (isHovered ? ` ${styles["timelineBarSection--hovered"]}` : "") }
                            style = {{
                                flex: new Date(e.properties.endDateStr).getTime() - new Date(e.properties.startDateStr).getTime(),
                                backgroundColor: colorStyle(colors[i], { a: isHovered ? 0.7 : 1 })
                            }}
                            onClick = {() => onTimelineSegmentClick(data[i])}
                            onMouseEnter = {() => isMobile ? onTimelineSegmentClick(data[i]) : onTimelineSegmentMouseEnter(data[i])}
                        />
                    })
                : null

            }
        </div>
    }

    function renderTimelineLabels() {
        if (!timelineDates) return;

        const elements = timelineDates.map((d, i) => {
            const [label, date] = d;
            const [_, nextDate] = i < timelineDates.length - 1
                ? timelineDates[i + 1]
                : [null, date];
            return <div
                key={i}
                className={styles.timelineLabelSection}
                style={{ "flex": nextDate.getTime() - date.getTime() }}
            >
                <div className={styles.timelineLabel}>
                    { label }
                </div>
            </div>
        });

        return <div className={styles.timelineLabels}>
            { ...elements }
        </div>;
    }


    return (
        <div className={styles.contents}>
            <div className={styles.topBar}>
                <a
                    href="https://docs.google.com/document/d/1-Lr0JzGtSfc1idizWjph9WaWwYeW6X--dkWxH_2qt-Y/edit"
                    target="_blank"
                    className={styles.topBarText}
                >
                    Click here to see our itinerary as a Google Doc
                </a>
            </div>
            <div ref={mapContainer} className={styles.mapContainer} />
            <div className={styles.timelineSection}>
                { renderTimelineBar() } 
                { renderTimelineLabels() }
            </div>
        </div>
    );
}
