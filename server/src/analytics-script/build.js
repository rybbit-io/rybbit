import { build } from "esbuild";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure public directory exists
const publicDir = "../../public";
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

async function buildScript() {
  try {
    // Build the full version
    await build({
      entryPoints: ["./index.ts"],
      bundle: true,
      format: "iife",
      target: "es2020",
      outfile: "../../public/script-full.js",
      minify: false,
      sourcemap: false,
      platform: "browser",
    });

    console.log("✅ Built script-full.js");

    // Build the minified version
    await build({
      entryPoints: ["./index.ts"],
      bundle: true,
      format: "iife",
      target: "es2020",
      outfile: "../../public/script.js",
      minify: true,
      sourcemap: false,
      platform: "browser",
    });

    console.log("✅ Built script.js (minified)");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildScript();
