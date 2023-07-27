"use client"

import Image from "next/image"
import styles from "./page.module.css"
import mapboxgl from "!mapbox-gl"
import React, { useRef, useEffect, useState } from "react"

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
    const [lng, setLng] = useState(-70.9);
    const [lat, setLat] = useState(42.35);
    const [zoom, setZoom] = useState(9);

    useEffect(() => {
        if (!mapboxgl.accessToken) {
            mapboxgl.accessToken = "pk.eyJ1IjoiY2FsZWJ3YW5nIiwiYSI6ImNsa2tseXV3dDB6djIza3A0d2ptbTY4MDgifQ.wn8a4HxeG1MzYcMEEtIdvg";
        }

        if (map.current) {
            return; // initialize map only once
        }

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [lng, lat],
            zoom: zoom
        });
    });

    return (
        <div ref={mapContainer} className={styles.mapContainer}/>
    );
}
