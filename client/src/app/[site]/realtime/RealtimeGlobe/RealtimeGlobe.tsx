"use client";

import { useQuery } from "@tanstack/react-query";
import { useWindowSize } from "@uidotdev/usehooks";
import { scaleSequentialSqrt } from "d3-scale";
import { interpolateYlOrRd } from "d3-scale-chromatic";
import { memoize, debounce } from "lodash";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Globe from "react-globe.gl";
import { MeshPhongMaterial } from "three";
import { useGetSessionLocations } from "../../../../api/analytics/useGetSessionLocations";
import { useAtom } from "jotai";
import { minutesAtom } from "../realtimeStore";

const randomShader = memoize((e: string) => {
  return `rgba(120, 140, 110, ${Math.random() / 2 + 0.5})`;
});

export const World = ({ width }: { width: number }) => {
  const globeEl = useRef<any>(null);
  const size = useWindowSize();

  const { data: liveSessionLocations, isLoading: isLiveSessionLocationsLoading } = useGetSessionLocations();

  const { data: countries = { features: [] } } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetch("/countries.geojson");
      return res.json();
    },
  });

  const highest = liveSessionLocations?.reduce((acc, curr) => Math.max(acc, curr.count), 0) ?? 1;

  const normalized = 5 / Number(30);
  const weightColor = scaleSequentialSqrt(interpolateYlOrRd).domain([0, highest * normalized * 15]);

  useEffect(() => {
    // Auto-rotate
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.2;
    }
  }, [globeEl.current]);

  const [hexAltitude, setHexAltitude] = useState(0.001);

  // Debounced updateAltitude handler: fires once, 200ms after the last 'end' event
  const updateAltitude = useCallback(
    debounce(() => {
      if (!globeEl.current) return;

      const controls = globeEl.current.controls();
      const distance = Math.round(controls.getDistance());

      const low = 0.001,
        mid = 0.005,
        high = 0.02;
      const near = 300,
        far = 600;
      const nextAlt = distance <= near ? low : distance >= far ? high : mid;

      // set only if changed
      if (nextAlt !== hexAltitude) {
        setHexAltitude(nextAlt);
      }
    }, 200),
    [globeEl, hexAltitude, setHexAltitude]
  );

  useEffect(() => {
    if (!globeEl.current) return;
    const controls = globeEl.current.controls();
    // Limit distance maximal distance
    controls.maxDistance = 900;
    // Subscribe on change event
    controls.addEventListener("end", updateAltitude);
    return () => {
      controls.removeEventListener("end", updateAltitude);
      updateAltitude.cancel(); // cancel any pending call
    };
  }, [globeEl, updateAltitude]);

  const oceanBlueMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: "hsl(220.9, 30.3%, 16%)",
        transparent: false,
        opacity: 1,
      }),
    []
  );

  const liveSessionLocationsData = useMemo(() => {
    return liveSessionLocations?.map(e => ({
      lat: e.lat,
      lng: e.lon,
      count: Math.max(1, e.count / highest),
    }));
  }, [liveSessionLocations]);

  const { width: windowWidth } = useWindowSize();

  return (
    <div
      onMouseDown={() => {
        if (globeEl.current) {
          globeEl.current.controls().autoRotate = false;
        }
      }}
    >
      <Globe
        onGlobeReady={() => {
          if (globeEl.current) {
            // Set initial view: lat, lng, and altitude (zoom)
            globeEl.current.pointOfView({
              lat: 20,
              lng: -36,
              altitude: windowWidth && windowWidth > 768 ? 2 : 3,
            });
          }
        }}
        ref={globeEl as any}
        width={width ?? 0}
        height={size.height ?? 0}
        globeOffset={[windowWidth && windowWidth > 768 ? -100 : 0, windowWidth && windowWidth > 768 ? 0 : 100]}
        atmosphereColor="rgba(170, 170, 200, 1)"
        globeMaterial={oceanBlueMaterial}
        hexPolygonsData={countries.features}
        hexPolygonResolution={3}
        hexPolygonMargin={0.2}
        hexBinResolution={3}
        hexBinPointsData={liveSessionLocationsData}
        hexPolygonAltitude={hexAltitude}
        hexBinMerge={true}
        hexBinPointWeight={"count"}
        backgroundColor="rgba(0, 0, 0, 0)"
        hexPolygonColor={(e: any) => {
          return randomShader(e.properties.ISO_A2);
        }}
        hexTopColor={d => weightColor(d.sumWeight)}
        hexSideColor={d => weightColor(d.sumWeight)}
        // @ts-ignore
        // hexPolygonLabel={(props: any) => {
        //   console.info(props);
        //   return <div>{props.properties.ADMIN}</div>;
        //   // <div className="text-neutral-100 bg-neutral-900 border border-neutral-700 rounded-md p-2 ">
        //   //   <div>
        //   //     <b>
        //   //       {d.ADMIN} ({d.ISO_A2})
        //   //     </b>
        //   //   </div>
        //   //   <div>
        //   //     Population: <i>{d.POP_EST}</i>
        //   //   </div>
        //   // </div>
        // }}
      />
    </div>
  );
};
