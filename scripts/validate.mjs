import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root = process.cwd();
const jsonFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,item.name);
    if(item.isDirectory()) walk(full);
    else if(item.name.endsWith(".json")) jsonFiles.push(full);
  }
}
walk(path.join(root,"behavior_pack")); walk(path.join(root,"resource_pack"));
for(const file of jsonFiles) JSON.parse(fs.readFileSync(file,"utf8"));
const bp=JSON.parse(fs.readFileSync("behavior_pack/manifest.json","utf8"));
const rp=JSON.parse(fs.readFileSync("resource_pack/manifest.json","utf8"));
assert.equal(bp.header.uuid,"0a8f8d7e-8b4a-4c75-9b36-1d3a6f4e2c10");
assert(bp.dependencies.some(d=>d.uuid===rp.header.uuid),"Behavior Pack must depend on Resource Pack");
assert(bp.modules.some(m=>m.type==="script"&&m.entry==="scripts/main.js"),"Script entry missing");
assert(fs.existsSync("behavior_pack/entities/friend.json"));
assert(fs.existsSync("resource_pack/entity/friend.entity.json"));
assert(fs.existsSync("resource_pack/models/entity/ai_friend.geo.json"));
assert(fs.existsSync("resource_pack/textures/entity/ai_friend.png"));
const script=fs.readFileSync("behavior_pack/scripts/main.js","utf8");
assert(script.includes('world.afterEvents.chatSend.subscribe'));
assert(script.includes('system.runInterval'));
console.log("PASS: JSON syntax, pack dependency, script entry, entity/model/texture files, and core event hooks.");
