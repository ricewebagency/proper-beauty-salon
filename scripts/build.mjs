import { rmSync, mkdirSync, cpSync, existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";

const SRC = "src";
const DOCS = "docs";
const ROOT_STATIC_EXTENSIONS = new Set([".html", ".xml", ".txt", ".ico"]);
// Alleen in docs/ aanwezig (GitHub Pages), moet een build overleven
const PRESERVE = ["CNAME"];

function clean() {
  const kept = PRESERVE.filter((f) => existsSync(`${DOCS}/${f}`)).map((f) => [f, readFileSync(`${DOCS}/${f}`)]);
  if (existsSync(DOCS)) rmSync(DOCS, { recursive: true, force: true });
  mkdirSync(DOCS, { recursive: true });
  for (const [f, content] of kept) writeFileSync(`${DOCS}/${f}`, content);
  mkdirSync(`${DOCS}/css`, { recursive: true });
  mkdirSync(`${DOCS}/js`, { recursive: true });
  mkdirSync(`${DOCS}/assets`, { recursive: true });
}

function copyStatic() {
  // kopieer alle root-bestanden die direct gepubliceerd moeten worden
  for (const file of readdirSync(SRC)) {
    const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
    if (ROOT_STATIC_EXTENSIONS.has(ext)) {
      cpSync(`${SRC}/${file}`, `${DOCS}/${file}`, { force: true });
    }
    // pagina-mappen (src/<pagina>/index.html)
    if (statSync(`${SRC}/${file}`).isDirectory() && existsSync(`${SRC}/${file}/index.html`)) {
      cpSync(`${SRC}/${file}`, `${DOCS}/${file}`, { recursive: true, force: true });
    }
  }

  cpSync(`${SRC}/js`, `${DOCS}/js`, { recursive: true, force: true });
  cpSync(`${SRC}/assets`, `${DOCS}/assets`, { recursive: true, force: true });
}

function buildCss() {
  execSync(
    "npx tailwindcss -i ./src/css/main.css -o ./docs/css/main.css --postcss --minify",
    { stdio: "inherit" }
  );
}

clean();
copyStatic();
buildCss();
