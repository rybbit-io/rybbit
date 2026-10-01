/**
 * What the page's own map buttons can ask of whichever engine is mounted
 * (Mapbox for the globe, OpenLayers for the flat map). The engine registers
 * its controller when its map is created and clears it when the map goes away.
 */
export interface MapController {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  /** The map as it is drawn now, as a PNG. HTML markers (session avatars) are not part of the canvas. */
  snapshot: () => Promise<Blob>;
}

let current: MapController | null = null;

export const getMapController = () => current;

/** Registers the mounted engine. Returns the cleanup that unregisters it. */
export function registerMapController(controller: MapController): () => void {
  current = controller;
  return () => {
    if (current === controller) current = null;
  };
}

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    // Throws synchronously when the canvas holds pixels from a source that did not allow reading them.
    try {
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("The map could not be exported"))), "image/png");
    } catch (error) {
      reject(error instanceof Error ? error : new Error("The map could not be exported"));
    }
  });
