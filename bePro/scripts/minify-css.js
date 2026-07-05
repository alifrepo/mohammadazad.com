const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { walk, loadCache, saveCache } = require("./utils");

const SRC = "assets/scss";
const DIST = "assets/dist/css";
const CACHE_FILE = ".cache/css.json";

const cache = loadCache(CACHE_FILE);
const files = walk(SRC, ".scss");

const updatedCache = {};
let changed = false;

for (const file of files) {
  if (path.basename(file).startsWith("_")) continue;

  const stat = fs.statSync(file);
  const last = cache[file];

  updatedCache[file] = stat.mtimeMs;

  if (last === stat.mtimeMs) continue;

  changed = true;
  const rel = path.relative(SRC, file).replace(/\.scss$/, ".min.css");
  const out = path.join(DIST, rel);

  fs.mkdirSync(path.dirname(out), { recursive: true });

  console.log("🎨 Minifying CSS:", rel);
  execSync(`npx sass "${file}" "${out}" --style=compressed`, {
    stdio: "inherit"
  });
}

saveCache(CACHE_FILE, updatedCache);

if (!changed) console.log("✅ CSS already up to date");
