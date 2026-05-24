"use client";

import { useEffect, useRef } from "react";
import { HeatmapDataPoint } from "../../api/analytics/endpoints/heatmap";

interface HeatmapCanvasProps {
  points: HeatmapDataPoint[];
  width: number;
  height: number;
  radius?: number;
  maxOpacity?: number;
  blur?: number;
  gridResolution?: number;
}

// Color gradient for heatmap (blue -> cyan -> green -> yellow -> red)
const GRADIENT_COLORS = [
  { stop: 0, color: "rgba(0, 0, 255, 0)" },
  { stop: 0.25, color: "rgba(0, 255, 255, 0.5)" },
  { stop: 0.5, color: "rgba(0, 255, 0, 0.6)" },
  { stop: 0.75, color: "rgba(255, 255, 0, 0.7)" },
  { stop: 1, color: "rgba(255, 0, 0, 0.8)" },
];

export function HeatmapCanvas({
  points,
  width,
  height,
  radius = 25,
  maxOpacity = 0.8,
  blur = 15,
  gridResolution = 100,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for normalization
    const maxValue = Math.max(...points.map((p) => p.value), 1);

    // Create offscreen canvas for the alpha mask
    const alphaCanvas = document.createElement("canvas");
    alphaCanvas.width = width;
    alphaCanvas.height = height;
    const alphaCtx = alphaCanvas.getContext("2d");
    if (!alphaCtx) return;

    // Draw circles for each point on alpha canvas
    points.forEach((point) => {
      // Convert percentage coordinates to pixel coordinates
      const x = (point.x / gridResolution) * width;
      const y = (point.y / gridResolution) * height;
      const intensity = point.value / maxValue;

      // Create radial gradient for each point
      const gradient = alphaCtx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      alphaCtx.beginPath();
      alphaCtx.fillStyle = gradient;
      alphaCtx.arc(x, y, radius, 0, Math.PI * 2);
      alphaCtx.fill();
    });

    // Apply blur to alpha canvas
    alphaCtx.filter = `blur(${blur}px)`;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.filter = `blur(${blur}px)`;
      tempCtx.drawImage(alphaCanvas, 0, 0);
    }

    // Get alpha data
    const alphaData = (tempCtx || alphaCtx).getImageData(0, 0, width, height);

    // Create gradient image
    const gradientCanvas = document.createElement("canvas");
    gradientCanvas.width = 256;
    gradientCanvas.height = 1;
    const gradientCtx = gradientCanvas.getContext("2d");
    if (!gradientCtx) return;

    const linearGradient = gradientCtx.createLinearGradient(0, 0, 256, 0);
    GRADIENT_COLORS.forEach(({ stop, color }) => {
      linearGradient.addColorStop(stop, color);
    });
    gradientCtx.fillStyle = linearGradient;
    gradientCtx.fillRect(0, 0, 256, 1);
    const gradientData = gradientCtx.getImageData(0, 0, 256, 1).data;

    // Apply colorization
    const outputData = ctx.createImageData(width, height);
    for (let i = 0; i < alphaData.data.length; i += 4) {
      const alpha = alphaData.data[i + 3];
      if (alpha > 0) {
        const gradientIndex = Math.min(255, Math.floor((alpha / 255) * 255)) * 4;
        outputData.data[i] = gradientData[gradientIndex]; // R
        outputData.data[i + 1] = gradientData[gradientIndex + 1]; // G
        outputData.data[i + 2] = gradientData[gradientIndex + 2]; // B
        outputData.data[i + 3] = Math.floor(alpha * maxOpacity); // A
      }
    }

    ctx.putImageData(outputData, 0, 0);
  }, [points, width, height, radius, maxOpacity, blur, gridResolution]);

  if (points.length === 0) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
}
