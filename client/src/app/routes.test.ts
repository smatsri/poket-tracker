import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import test from "node:test";
import { matchRoute, navigation } from "./routes.ts";

test("the document is Hebrew and RTL", () => {
  const html = readFileSync("index.html", "utf8");
  assert.match(html, /lang="he"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /viewport-fit=cover/);
});

test("navigation labels reach the three routes", () => {
  assert.deepEqual(
    navigation.map((item) => [item.path, item.label]),
    [
      ["/", "ערב נוכחי"],
      ["/history", "היסטוריה"],
      ["/stats", "סיכומים"],
    ],
  );
  assert.equal(matchRoute("/").label, "ערב נוכחי");
  assert.equal(matchRoute("/history/").id, "history");
  assert.equal(matchRoute("/history/session-1").id, "history");
  assert.equal(matchRoute("/stats").id, "stats");
  assert.equal(matchRoute("/missing").id, "unknown");
});

test("design tokens, Heebo, cards, and actions match the visual language", () => {
  const css = readFileSync("src/styles/global.css", "utf8");
  for (const token of ["#F5F6F4", "#FFFFFF", "#EEF1ED", "#35C653", "#E7F8E9", "#18221D", "#77817B", "#E6EAE6", "#249B45", "#D94B4B", "#D99A2B"]) {
    assert.match(css, new RegExp(token, "i"));
  }

  assert.match(css, /@fontsource\/heebo\/hebrew-400\.css/);
  assert.match(css, /@fontsource\/heebo\/latin-400\.css/);
  assert.match(css, /\.card\b/);
  assert.match(css, /\.button-primary\b/);
  assert.match(css, /\.button-secondary\b/);
  assert.match(css, /\.button-destructive\b/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /min-block-size:\s*44px/);
});

test("screen styles do not position with left or right", () => {
  const files = globSync("src/**/*.{css,tsx}");
  const physical = /(?:^|[^a-z-])(?:left|right)(?=$|[^a-z-])/i;
  assert.ok(files.length > 0);
  for (const file of files) {
    assert.equal(physical.test(readFileSync(file, "utf8")), false, file);
  }
});
