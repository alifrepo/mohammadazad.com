const fs = require("fs");
const path = require("path");
const { walk } = require("./utils");

const pairs = [
  ["assets/scss", "assets/dist/css", ".scss", ".min.css"],
  ["assets/js", "assets/dist/js", ".js", ".min.js"]
];

for (const [src, dist, fromExt, toExt] of pairs) {
  const srcFiles = walk(src, fromExt).map(f =>
    path.relative(src, f).replace(fromExt, toExt)
  );

  const distFiles = walk(dist, toExt).map(f =>
    path.relative(dist, f)
  );

  for (const file of distFiles) {
    if (!srcFiles.includes(file)) {
      const full = path.join(dist, file);
      fs.unlinkSync(full);
      console.log("🧹 Removed orphan:", full);
    }
  }
}
