const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Paths
const SRC = path.resolve("assets/js");
const DIST = path.resolve("assets/dist/js");

// Safety checks
if (!fs.existsSync(SRC)) {
  console.error("❌ JS source folder not found:", SRC);
  process.exit(1);
}

fs.mkdirSync(DIST, { recursive: true });

// Walk function
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

const files = walk(SRC);

if (files.length === 0) {
  console.warn("⚠️ No JS files found in assets/js");
  process.exit(0);
}

console.log("📂 JS files found:");
files.forEach(f => console.log("  -", path.relative(SRC, f)));

for (const file of files) {
  const rel = path.relative(SRC, file);
  const out = path.join(DIST, rel);
  const min = out.replace(/\.js$/, ".min.js");

  fs.mkdirSync(path.dirname(out), { recursive: true });

  // Copy original
  fs.copyFileSync(file, out);
  console.log("📄 Copied:", rel);

  // Minify
  console.log("⚡ Minifying:", rel);
  execSync(`npx terser "${out}" -o "${min}" --compress --mangle --comments /^!/`, {
    stdio: "inherit"
  });
}

console.log("✅ JS build complete");
