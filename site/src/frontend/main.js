import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/noto-serif-sc/900.css";
import { mountStage } from "./city/stage.js";
import { mountMini } from "./city/mini.js";
import { mountAtlas } from "./city/map.js";
import { wirePanel } from "./city/panel.js";
import { wireAgent, wireCrayon, wireIdeaForm, wireShelves, wireTheme } from "./city/ui.js";

let stage = null;
let city = null;
const stageRoot = document.getElementById("descent");
const cityData = document.getElementById("city-data");
try {
  city = cityData ? JSON.parse(cityData.textContent) : null;
} catch {
  city = null;
}
if (stageRoot && city) {
  try {
    stage = mountStage(stageRoot, city);
  } catch {
    stage = null;
  }
}
if (city) document.querySelectorAll("[data-atlas]").forEach(root => mountAtlas(root, city, stage));
document.querySelectorAll(".lot[data-type]").forEach(mountMini);
wirePanel();
wireTheme();
wireAgent(stage);
wireShelves();
wireIdeaForm(stage);
wireCrayon();
