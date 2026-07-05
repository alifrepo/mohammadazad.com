const fs = require("fs");
const path = require("path");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const year = new Date().getFullYear();

const banner =
`/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * https://alfuix.com/doc/
 *
 * © ${year} ${pkg.author}
 */
`;

const targets = ["assets/dist/css", "assets/dist/js"];

for (const dir of targets) {
  if (!fs.existsSync(dir)) continue;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".css") && !file.endsWith(".js")) continue;

    const full = path.join(dir, file);
    const content = fs.readFileSync(full, "utf8");

    if (content.startsWith("/*!")) continue;

    fs.writeFileSync(full, banner + content);
    console.log("🏷️  Banner added:", file);
  }
}
