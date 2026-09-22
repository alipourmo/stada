const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "preview_dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "assets"), { recursive: true });
fs.copyFileSync(path.join(__dirname, "stada-preview.css"), path.join(out, "assets", "styles.css"));
fs.copyFileSync(path.join(__dirname, "stada-preview.js"), path.join(out, "assets", "preview.js"));
fs.copyFileSync(path.join(__dirname, "stada-preview.html"), path.join(out, "index.html"));
