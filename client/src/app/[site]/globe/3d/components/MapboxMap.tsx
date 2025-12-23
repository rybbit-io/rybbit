import { RefObject } from "react";
import { NothingFound } from "../../../../../components/NothingFound";
import { useConfigs } from "../../../../../lib/configs";

export const MapboxMap = ({ mapContainer }: { mapContainer: RefObject<HTMLDivElement | null> }) => {
  const { configs, isLoading } = useConfigs();

  return (
    <>
      {configs?.mapboxToken ? (
        <div
          ref={mapContainer}
          className="w-full h-full [&_.mapboxgl-ctrl-bottom-left]:hidden! [&_.mapboxgl-ctrl-logo]:hidden!"
        />
      ) : isLoading ? null : (
        <div className="w-full h-full flex items-center justify-center">
          <NothingFound
            title="Mapbox access token not found"
            description={
              <p className="text-sm max-w-[600px] text-center">
                Please set the <code>MAPBOX_TOKEN</code> environment variable and rebuild all containers. To get a
                Mapbox token, please visit{" "}
                <a
                  href="https://docs.mapbox.com/help/dive-deeper/access-tokens/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Mapbox
                </a>{" "}
                and create an account.
              </p>
            }
          />
        </div>
      )}
    </>
  );
};
