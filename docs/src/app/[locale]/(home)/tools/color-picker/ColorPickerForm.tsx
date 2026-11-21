"use client";

import { ArrowLeftRight, Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, "");
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map(character => character + character)
          .join("")
      : raw;

  return /^[0-9a-fA-F]{6}$/.test(expanded) ? `#${expanded.toLowerCase()}` : null;
}

function hexToRgb(hex: string): RGBColor {
  const value = hex.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: RGBColor) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    if (max === green) hue = 60 * ((blue - red) / delta + 2);
    if (max === blue) hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;

  return {
    h: Math.round(hue),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function relativeLuminance({ r, g, b }: RGBColor) {
  const [red, green, blue] = [r, g, b].map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(foreground: RGBColor, background: RGBColor) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function formatContrastRatio(ratio: number) {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

const textInputClass =
  "w-full border border-neutral-300 bg-white font-mono text-neutral-950 placeholder:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-400";

export function ColorPickerForm() {
  const [foregroundInput, setForegroundInput] = useState("#10b981");
  const [backgroundInput, setBackgroundInput] = useState("#141414");
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const foregroundHex = normalizeHex(foregroundInput);
  const backgroundHex = normalizeHex(backgroundInput);

  const colorData = useMemo(() => {
    if (!foregroundHex || !backgroundHex) return null;

    const foregroundRgb = hexToRgb(foregroundHex);
    const backgroundRgb = hexToRgb(backgroundHex);
    const hsl = rgbToHsl(foregroundRgb);

    return {
      foregroundRgb,
      hsl,
      ratio: getContrastRatio(foregroundRgb, backgroundRgb),
      rgbText: `rgb(${foregroundRgb.r}, ${foregroundRgb.g}, ${foregroundRgb.b})`,
      hslText: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    };
  }, [backgroundHex, foregroundHex]);

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setCopyError(null);
      window.setTimeout(() => setCopied(current => (current === key ? null : current)), 1800);
    } catch {
      setCopied(null);
      setCopyError("Copy is unavailable in this browser. Select the value and copy it manually.");
    }
  };

  const swapColors = () => {
    setForegroundInput(backgroundHex ?? backgroundInput);
    setBackgroundInput(foregroundHex ?? foregroundInput);
    setCopied(null);
    setCopyError(null);
  };

  const contrastChecks = colorData
    ? [
        { label: "AA normal text", threshold: 4.5, passes: colorData.ratio >= 4.5 },
        { label: "AA large text", threshold: 3, passes: colorData.ratio >= 3 },
        { label: "AAA normal text", threshold: 7, passes: colorData.ratio >= 7 },
        { label: "AAA large text", threshold: 4.5, passes: colorData.ratio >= 4.5 },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label htmlFor="foreground-color" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Foreground color
          </label>
          <input
            id="foreground-color"
            type="color"
            value={foregroundHex ?? "#10b981"}
            onChange={event => setForegroundInput(event.target.value)}
            className="h-12 w-full cursor-pointer border border-neutral-300 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <label
            htmlFor="foreground-hex"
            className="mt-3 mb-2 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
          >
            HEX value
          </label>
          <input
            id="foreground-hex"
            type="text"
            value={foregroundInput}
            onChange={event => {
              setForegroundInput(event.target.value);
              setCopyError(null);
            }}
            placeholder="#10b981"
            className={textInputClass}
            aria-invalid={!foregroundHex}
            aria-describedby={!foregroundHex ? "foreground-error" : undefined}
          />
          {!foregroundHex && (
            <p id="foreground-error" role="alert" className="mt-1.5 text-xs text-red-700 dark:text-red-400">
              Enter a 3- or 6-digit HEX color.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={swapColors}
          disabled={!foregroundHex || !backgroundHex}
          className="inline-flex items-center justify-center gap-2 border border-neutral-300 bg-white px-3 py-2 font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Swap foreground and background colors"
        >
          <ArrowLeftRight className="size-4" aria-hidden="true" />
          <span className="sm:hidden">Swap colors</span>
        </button>

        <div>
          <label htmlFor="background-color" className="mb-2 block text-sm font-medium text-neutral-900 dark:text-white">
            Background color
          </label>
          <input
            id="background-color"
            type="color"
            value={backgroundHex ?? "#141414"}
            onChange={event => setBackgroundInput(event.target.value)}
            className="h-12 w-full cursor-pointer border border-neutral-300 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <label
            htmlFor="background-hex"
            className="mt-3 mb-2 block text-xs font-medium text-neutral-700 dark:text-neutral-300"
          >
            HEX value
          </label>
          <input
            id="background-hex"
            type="text"
            value={backgroundInput}
            onChange={event => {
              setBackgroundInput(event.target.value);
              setCopyError(null);
            }}
            placeholder="#141414"
            className={textInputClass}
            aria-invalid={!backgroundHex}
            aria-describedby={!backgroundHex ? "background-error" : undefined}
          />
          {!backgroundHex && (
            <p id="background-error" role="alert" className="mt-1.5 text-xs text-red-700 dark:text-red-400">
              Enter a 3- or 6-digit HEX color.
            </p>
          )}
        </div>
      </div>

      {colorData && foregroundHex && backgroundHex && (
        <>
          <section aria-label="Color preview">
            <p className="mb-2 text-sm font-medium text-neutral-900 dark:text-white">Preview</p>
            <div
              className="min-h-32 rounded-lg border border-neutral-300 p-5 dark:border-neutral-700"
              style={{ color: foregroundHex, backgroundColor: backgroundHex }}
            >
              <p className="text-lg font-semibold">Readable color starts with measurable contrast.</p>
              <p className="mt-2 max-w-xl text-sm leading-6">
                Preview normal and large text on the selected background before using the pair in an interface.
              </p>
            </div>
          </section>

          <section aria-label="Color values">
            <h2 className="text-sm font-medium text-neutral-900 dark:text-white">Converted foreground values</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              {[
                { key: "hex", label: "HEX", value: foregroundHex },
                { key: "rgb", label: "RGB", value: colorData.rgbText },
                { key: "hsl", label: "HSL", value: colorData.hslText },
              ].map((format, index) => (
                <div
                  key={format.key}
                  className={`flex min-w-0 items-center gap-3 bg-white p-3 dark:bg-neutral-900 ${index > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""}`}
                >
                  <span className="w-10 shrink-0 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {format.label}
                  </span>
                  <code className="min-w-0 flex-1 truncate text-sm text-neutral-950 dark:text-neutral-50">
                    {format.value}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyValue(format.key, format.value)}
                    className="inline-flex shrink-0 items-center gap-2 border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                    aria-label={`Copy ${format.label} value`}
                  >
                    {copied === format.key ? (
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">{copied === format.key ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-live="polite"
            aria-label="Contrast result"
            className="border-y border-neutral-200 py-5 dark:border-neutral-800"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">WCAG contrast ratio</h2>
                <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-neutral-950 dark:text-white">
                  {formatContrastRatio(colorData.ratio)}:1
                </p>
              </div>
              <p className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">WCAG 2.2 text thresholds</p>
            </div>
            <dl className="mt-5 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
              {contrastChecks.map((check, index) => (
                <div
                  key={check.label}
                  className={`flex items-center justify-between gap-3 bg-white p-3 dark:bg-neutral-900 ${index > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""}`}
                >
                  <div>
                    <dt className="text-sm font-medium text-neutral-900 dark:text-white">{check.label}</dt>
                    <dd className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                      Requires {check.threshold}:1
                    </dd>
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${check.passes ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"}`}
                  >
                    {check.passes ? "Pass" : "Fail"}
                  </span>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      <p
        aria-live="polite"
        className={`text-xs ${copyError ? "text-red-700 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400"}`}
      >
        {copyError ??
          (copied ? "Color value copied to the clipboard." : "Colors stay in your browser and are not uploaded.")}
      </p>
    </div>
  );
}
