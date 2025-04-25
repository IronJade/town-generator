import { readFileSync, writeFileSync } from "fs";

// Read manifest.json
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));

// Read package.json
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

// Make sure versions match
manifest.version = packageJson.version;

// Read versions.json if it exists, create it otherwise
let versions = {};
try {
  versions = JSON.parse(readFileSync("versions.json", "utf8"));
} catch (e) {
  console.log("Creating versions.json...");
}

// Add/update version in versions.json
const { minAppVersion } = manifest;
versions[packageJson.version] = minAppVersion;

// Write files
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2));
writeFileSync("versions.json", JSON.stringify(versions, null, 2));

console.log(`Updated to version ${packageJson.version} with minimum app version ${minAppVersion}`);