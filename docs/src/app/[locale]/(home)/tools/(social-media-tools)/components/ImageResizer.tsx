"use client";

import { useState, useCallback, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Upload, Download, RotateCw, ZoomIn, Image as ImageIcon, X } from "lucide-react";
import { ImageResizerPlatformConfig } from "./image-resizer-platform-configs";
import getCroppedImg from "./image-resizer-utils";
import { ToolButton, ToolCallout, ToolField } from "../../components/tool-ui";

interface ImageResizerProps {
  platform: ImageResizerPlatformConfig;
}

export default function ImageResizer({ platform }: ImageResizerProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedDimensionIndex, setSelectedDimensionIndex] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDimension = platform.dimensions[selectedDimensionIndex];
  
  // Calculate aspect ratio from dimensions if not explicitly provided
  const aspect = selectedDimension.aspectRatio ?? (selectedDimension.width / selectedDimension.height);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || null);
        setZoom(1);
        setRotation(0);
      });
      reader.readAsDataURL(file);
    }
  };

  const onDownload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      setIsGenerating(true);
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        { horizontal: false, vertical: false },
        selectedDimension.width,
        selectedDimension.height
      );

      if (croppedImage) {
        const link = document.createElement("a");
        link.download = `${platform.id}-${selectedDimension.label.toLowerCase().replace(/\s+/g, "-")}.jpg`;
        link.href = croppedImage;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetImage = () => {
    setImageSrc(null);
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="space-y-8">
      {/* Controls Section */}
      <ToolField label="Select Image Type">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {platform.dimensions.map((dim, index) => (
            <button
              key={index}
              onClick={() => setSelectedDimensionIndex(index)}
              className={`p-3 rounded-md border text-left transition-colors ${
                selectedDimensionIndex === index
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/25 ring-1 ring-emerald-500"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-emerald-300 dark:hover:border-emerald-700"
              }`}
            >
              <div className="font-medium text-neutral-900 dark:text-white">
                {dim.label}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {dim.width} x {dim.height} px
              </div>
              {dim.description && (
                <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  {dim.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </ToolField>

      {/* Editor Section */}
      <div className="bg-white dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
        {!imageSrc ? (
          <div 
            className="h-80 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors border-2 border-dashed border-neutral-300 dark:border-neutral-700 m-4 rounded-lg"
            onClick={triggerFileInput}
          >
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
              <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-medium text-neutral-900 dark:text-white mb-1">
              Upload an image
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              JPG, PNG, or WebP (Max 10MB)
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="relative h-[500px] w-full bg-neutral-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
              />
              <button
                onClick={resetImage}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors z-10"
                title="Remove image"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editing Controls */}
            <div className="p-6 space-y-6 border-t border-neutral-200 dark:border-neutral-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-2">
                      <ZoomIn className="w-4 h-4" /> Zoom
                    </span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-md appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="flex items-center gap-2">
                      <RotateCw className="w-4 h-4" /> Rotation
                    </span>
                    <span>{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    value={rotation}
                    min={0}
                    max={360}
                    step={1}
                    aria-labelledby="Rotation"
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-md appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  Output: <span className="font-mono text-neutral-900 dark:text-white">{selectedDimension.width} x {selectedDimension.height}px</span>
                </div>
                <ToolButton onClick={onDownload} loading={isGenerating} icon={Download}>
                  {isGenerating ? "Processing..." : "Download Image"}
                </ToolButton>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <ToolCallout variant="tip" icon={ImageIcon} title="Why use this tool?">
        {platform.educationalContent} This tool ensures your images are perfectly sized to avoid automatic cropping or quality loss.
      </ToolCallout>
    </div>
  );
}

