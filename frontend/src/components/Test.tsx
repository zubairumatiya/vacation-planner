// Copyright (c) 2023 Vis.gl contributors
// Licensed under the MIT License
import styles from "../styles/Test.module.css";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useState } from "react";

const API_KEY = import.meta.env.VITE_MAPS_API_KEY;

const Test = () => {
  const [skipMap, setSkipMap] = useState<boolean>(true);
  return skipMap ? (
    <p>No map sorry</p>
  ) : (
    <APIProvider apiKey={String(API_KEY)}>
      <Map
        style={{ width: "100vw", height: "100vh" }}
        defaultCenter={{ lat: 22.54992, lng: 0 }}
        defaultZoom={3}
        gestureHandling="greedy"
        //disableDefaultUI
      />
    </APIProvider>
  );
};

export default Test;
