import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const jsonFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (item.name.endsWith(".json")) jsonFiles.push(full);
  }
}
walk("behavior_pack");
walk("resource_pack");
for (const file of jsonFiles) JSON.parse(fs.readFileSync(file, "utf8"));

const bp = JSON.parse(fs.readFileSync("behavior_pack/manifest.json", "utf8"));
const rp = JSON.parse(fs.readFileSync("resource_pack/manifest.json", "utf8"));
assert.equal(bp.header.uuid, "0a8f8d7e-8b4a-4c75-9b36-1d3a6f4e2c10");
assert(bp.dependencies.some(dep => dep.uuid === rp.header.uuid), "Behavior Pack must depend on Resource Pack");
assert(bp.dependencies.some(dep => dep.module_name === "@minecraft/server" && dep.version === "2.0.0"), "Stable Script API dependency missing");
assert(bp.modules.some(module => module.type === "script" && module.entry === "scripts/main.js"), "Script entry missing");
assert(fs.existsSync("behavior_pack/entities/friend.json"));
assert(fs.existsSync("resource_pack/entity/friend.entity.json"));
assert(fs.existsSync("resource_pack/models/entity/ai_friend.geo.json"));
assert(fs.existsSync("resource_pack/textures/entity/ai_friend.png"));

const script = fs.readFileSync("behavior_pack/scripts/main.js", "utf8");
for (const required of [
  "world.beforeEvents?.chatSend",
  "system.afterEvents?.scriptEventReceive",
  "aimf:friends",
  "system.runInterval",
  "getDynamicProperty",
  "setDynamicProperty",
  "collectTick",
  "mineTick",
  "inventory",
  "MINE_DROPS",
  "startHut",
  "hutBlueprint",
  "buildTick",
  "safeExploreTarget",
  "exploreTick",
  "guardTick",
  "patrolTick",
  "startGuard",
  "startTower",
  "action === \"guard\"",
  "action === \"patrol\"",
  "action === \"home\"",
  "action === \"sethome\"",
  "action === \"build\"",
  "action === \"explore\""
]) assert(script.includes(required), "Missing Phase 2 implementation marker: " + required);

console.log("PASS: JSON syntax, pack UUID dependency, stable Script API declaration, entity/model/texture files, and Phase 2 task/inventory hooks plus Phase 3–5 construction, guard, patrol, and home hooks.");
