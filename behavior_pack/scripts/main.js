import { world, system } from "@minecraft/server";

const ENTITY_ID = "aimf:friend";
const MAX_FRIENDS = 8;
const TICK_INTERVAL = 10;
const TASK_TICK_INTERVAL = 20;
const FOLLOW_DISTANCE = 2.4;
const FOLLOW_IMPULSE = 0.055;
const TASK_IMPULSE = 0.035;
const DIMENSIONS = ["overworld", "nether", "the_end"];
const INVENTORY_KEY = "aimf_inventory_v1";
const TASK_KEY = "aimf_task_v1";
const ROLE_KEY = "aimf_role_v1";
const MINE_TARGET_KEY = "aimf_mine_target_v1";
const MINE_COUNT_KEY = "aimf_mine_count_v1";
const MINE_LIMIT = 12;

// Phase 2 mining is intentionally restricted to common blocks and uses a
// companion-owned virtual inventory ledger. It does not emulate tool tiers,
// enchantments, Fortune, or vanilla loot tables.
const MINE_DROPS = {
  "minecraft:oak_log": "minecraft:oak_log",
  "minecraft:birch_log": "minecraft:birch_log",
  "minecraft:spruce_log": "minecraft:spruce_log",
  "minecraft:jungle_log": "minecraft:jungle_log",
  "minecraft:acacia_log": "minecraft:acacia_log",
  "minecraft:dark_oak_log": "minecraft:dark_oak_log",
  "minecraft:mangrove_log": "minecraft:mangrove_log",
  "minecraft:cherry_log": "minecraft:cherry_log",
  "minecraft:stone": "minecraft:cobblestone",
  "minecraft:cobblestone": "minecraft:cobblestone",
  "minecraft:coal_ore": "minecraft:coal",
  "minecraft:deepslate_coal_ore": "minecraft:coal",
  "minecraft:iron_ore": "minecraft:raw_iron",
  "minecraft:deepslate_iron_ore": "minecraft:raw_iron",
  "minecraft:copper_ore": "minecraft:raw_copper",
  "minecraft:deepslate_copper_ore": "minecraft:raw_copper"
};

function safeName(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16);
}
function ownerTag(player) {
  return "aimf_owner_" + safeName(player.name).toLowerCase();
}
function friendNameTag(name) {
  return "aimf_name_" + safeName(name).toLowerCase();
}
function reply(player, message) {
  try { player.sendMessage("§b[AI Friends]§r " + message); } catch {}
}
function allFriends(player) {
  const result = [];
  for (const dimId of DIMENSIONS) {
    try {
      const dim = world.getDimension(dimId);
      for (const entity of dim.getEntities({ type: ENTITY_ID, tags: [ownerTag(player)] })) result.push(entity);
    } catch {}
  }
  return result;
}
function findFriend(player, name) {
  const wanted = String(name ?? "").toLowerCase();
  return allFriends(player).find(entity =>
    entity.getTags().some(tag => tag.startsWith("aimf_name_") && tag.slice(10) === wanted)
  );
}
function displayName(entity) {
  const tag = entity.getTags().find(value => value.startsWith("aimf_name_"));
  return tag ? tag.slice(10) : entity.nameTag || "Friend";
}
function selected(player, target) {
  if (!target || target.toLowerCase() === "all") return allFriends(player);
  const found = findFriend(player, target);
  return found ? [found] : [];
}
function setMode(entity, mode) {
  entity.removeTag("aimf_mode_follow");
  entity.removeTag("aimf_mode_stay");
  entity.addTag("aimf_mode_" + mode);
}
function readInventory(entity) {
  try {
    const raw = entity.getDynamicProperty(INVENTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function writeInventory(entity, inventory) {
  try { entity.setDynamicProperty(INVENTORY_KEY, JSON.stringify(inventory)); return true; }
  catch { return false; }
}
function addInventory(entity, itemId, amount) {
  const inventory = readInventory(entity);
  const current = Number(inventory[itemId] || 0);
  const accepted = Math.max(0, Math.min(Number(amount) || 0, 999 - current));
  if (accepted < 1) return 0;
  inventory[itemId] = current + accepted;
  return writeInventory(entity, inventory) ? accepted : 0;
}
function taskOf(entity) {
  try { return String(entity.getDynamicProperty(TASK_KEY) || "idle"); }
  catch { return "idle"; }
}
function setTask(entity, task) {
  try { entity.setDynamicProperty(TASK_KEY, task); return true; }
  catch { return false; }
}
function setRole(entity, role) {
  try { entity.setDynamicProperty(ROLE_KEY, role); return true; }
  catch { return false; }
}
function getRole(entity) {
  try { return String(entity.getDynamicProperty(ROLE_KEY) || "companion"); }
  catch { return "companion"; }
}
function stopTask(entity) {
  setTask(entity, "idle");
  try {
    entity.setDynamicProperty(MINE_TARGET_KEY, "");
    entity.setDynamicProperty(MINE_COUNT_KEY, 0);
  } catch {}
}
function spawnFriend(player, name) {
  const clean = safeName(name) || "Friend";
  const current = allFriends(player);
  if (current.length >= MAX_FRIENDS) {
    reply(player, "Limit reached: " + MAX_FRIENDS + " companions per player in this Android performance profile.");
    return;
  }
  if (findFriend(player, clean)) {
    reply(player, "A friend named " + clean + " already exists. Choose another name.");
    return;
  }
  const p = player.location;
  const angle = Math.random() * Math.PI * 2;
  const location = { x: p.x + Math.cos(angle) * 2, y: p.y, z: p.z + Math.sin(angle) * 2 };
  try {
    const entity = player.dimension.spawnEntity(ENTITY_ID, location);
    entity.addTag(ownerTag(player));
    entity.addTag(friendNameTag(clean));
    entity.addTag("aimf_mode_follow");
    entity.nameTag = clean;
    setRole(entity, "companion");
    setTask(entity, "idle");
    writeInventory(entity, {});
    reply(player, "Spawned " + clean + ". (" + (current.length + 1) + "/" + MAX_FRIENDS + ")");
  } catch (error) {
    reply(player, "Could not spawn companion. Check that both packs are enabled. " + String(error).slice(0, 100));
  }
}
function inventorySummary(entity) {
  const inventory = readInventory(entity);
  const entries = Object.entries(inventory).filter(([, count]) => Number(count) > 0);
  if (!entries.length) return "empty";
  return entries.map(([id, count]) => id.replace("minecraft:", "") + " ×" + count).join(", ");
}
function normalizeBlockId(value) {
  const clean = String(value || "oak_log").toLowerCase();
  return clean.includes(":") ? clean : "minecraft:" + clean;
}
function assignMine(entity, blockId) {
  if (!Object.prototype.hasOwnProperty.call(MINE_DROPS, blockId)) return false;
  stopTask(entity);
  setTask(entity, "mine");
  try {
    entity.setDynamicProperty("aimf_mine_block_v1", blockId);
    entity.setDynamicProperty(MINE_COUNT_KEY, 0);
    entity.setDynamicProperty(MINE_TARGET_KEY, "");
  } catch { return false; }
  return true;
}
function findMineTarget(entity, blockId) {
  const base = entity.location;
  let best = null;
  let bestDistance = Infinity;
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      for (let y = -1; y <= 2; y++) {
        try {
          const pos = { x: Math.floor(base.x) + x, y: Math.floor(base.y) + y, z: Math.floor(base.z) + z };
          const block = entity.dimension.getBlock(pos);
          if (!block || block.typeId !== blockId) continue;
          const distance = x*x + y*y + z*z;
          if (distance < bestDistance) {
            best = { x: pos.x, y: pos.y, z: pos.z };
            bestDistance = distance;
          }
        } catch {}
      }
    }
  }
  return best;
}
function mineTick(entity) {
  let blockId = "minecraft:oak_log";
  let mined = 0;
  let target = null;
  try {
    blockId = String(entity.getDynamicProperty("aimf_mine_block_v1") || blockId);
    mined = Number(entity.getDynamicProperty(MINE_COUNT_KEY) || 0);
    const rawTarget = entity.getDynamicProperty(MINE_TARGET_KEY);
    target = rawTarget ? JSON.parse(rawTarget) : null;
  } catch {}
  if (mined >= MINE_LIMIT) {
    stopTask(entity);
    entity.nameTag = displayName(entity);
    return "complete";
  }

  let targetBlock;
  if (target) {
    try {
      targetBlock = entity.dimension.getBlock(target);
      if (!targetBlock || targetBlock.typeId !== blockId) target = null;
    } catch { target = null; }
  }
  if (!target) {
    target = findMineTarget(entity, blockId);
    if (!target) return "none";
    try { entity.setDynamicProperty(MINE_TARGET_KEY, JSON.stringify(target)); } catch {}
    targetBlock = entity.dimension.getBlock(target);
  }

  const here = entity.location;
  const dx = target.x + 0.5 - here.x;
  const dy = target.y + 0.5 - here.y;
  const dz = target.z + 0.5 - here.z;
  const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (distance > 2.25) {
    const length = Math.max(distance, 0.001);
    try { entity.applyImpulse({ x: dx/length*TASK_IMPULSE, y: dy/length*0.018, z: dz/length*TASK_IMPULSE }); } catch {}
    return "moving";
  }

  try {
    if (targetBlock && targetBlock.typeId === blockId) {
      targetBlock.setType("minecraft:air");
      const accepted = addInventory(entity, MINE_DROPS[blockId], 1);
      if (accepted) {
        mined += 1;
        entity.setDynamicProperty(MINE_COUNT_KEY, mined);
        entity.setDynamicProperty(MINE_TARGET_KEY, "");
        if (mined >= MINE_LIMIT) {
          stopTask(entity);
          return "complete";
        }
        return "mined";
      }
    }
  } catch {}
  try { entity.setDynamicProperty(MINE_TARGET_KEY, ""); } catch {}
  return "retry";
}
function collectTick(entity) {
  let collected = 0;
  try {
    const nearby = entity.dimension.getEntities({ location: entity.location, maxDistance: 2.2 });
    for (const itemEntity of nearby) {
      let itemComponent;
      try { itemComponent = itemEntity.getComponent("minecraft:item"); } catch {}
      if (!itemComponent || !itemComponent.itemStack) continue;
      const stack = itemComponent.itemStack;
      const accepted = addInventory(entity, stack.typeId, stack.amount);
      if (accepted === stack.amount) {
        try { itemEntity.remove(); collected += accepted; } catch {}
      }
    }
  } catch {}
  return collected;
}

function runCommand(player, raw) {
  const text = raw.trim();
  if (!text) return;
  const parts = text.split(/\s+/);
  const root = parts[0].toLowerCase();
  if (root !== "!friends" && root !== "!friend") return;
  const action = (parts[1] || "help").toLowerCase();
  const target = parts[2] || "all";

  if (action === "help") {
    reply(player, "Commands: spawn <name|count>, list, follow/stay/come <name|all>, rename <old> <new>, role <name> <companion|miner|collector>, mine <name|all> <block>, collect <name|all>, inventory <name>, task <name>, stop <name|all>, remove <name|all>.");
    return;
  }
  if (action === "spawn") {
    const count = Number(target);
    if (Number.isInteger(count) && count > 0) {
      const n = Math.min(count, MAX_FRIENDS - allFriends(player).length);
      for (let i = 0; i < n; i++) spawnFriend(player, "Friend" + (allFriends(player).length + 1));
      if (n < count) reply(player, "Spawned " + n + " only; the current cap is " + MAX_FRIENDS + ".");
    } else spawnFriend(player, safeName(target) || "Friend");
    return;
  }
  if (action === "list") {
    const list = allFriends(player);
    reply(player, list.length ? "Your friends: " + list.map(e => displayName(e) + " [" + getRole(e) + "; " + taskOf(e) + "]").join(", ") : "You have no friends. Use !friends spawn Alex.");
    return;
  }
  if (action === "follow" || action === "stay" || action === "come") {
    const friends = selected(player, target);
    if (!friends.length) { reply(player, "No matching friend. Use !friends list."); return; }
    for (const friend of friends) {
      stopTask(friend);
      setMode(friend, action === "stay" ? "stay" : "follow");
      if (action === "come") {
        try { friend.teleport({ x: player.location.x+1, y: player.location.y, z: player.location.z+1 }, { dimension: player.dimension }); } catch {}
      }
    }
    reply(player, friends.length + " friend(s) set to " + (action === "come" ? "come/follow" : action) + ".");
    return;
  }
  if (action === "rename") {
    const oldName = parts[2], newName = safeName(parts[3]);
    const friend = findFriend(player, oldName);
    if (!friend || !newName) { reply(player, "Usage: !friends rename <oldName> <newName>"); return; }
    if (findFriend(player, newName)) { reply(player, "That name is already in use."); return; }
    friend.removeTag(friendNameTag(oldName));
    friend.addTag(friendNameTag(newName));
    friend.nameTag = newName;
    reply(player, oldName + " is now " + newName + ".");
    return;
  }
  if (action === "role") {
    const friends = selected(player, target);
    const role = String(parts[3] || "").toLowerCase();
    if (!friends.length || !["companion", "miner", "collector"].includes(role)) {
      reply(player, "Usage: !friends role <name|all> <companion|miner|collector>"); return;
    }
    for (const friend of friends) setRole(friend, role);
    reply(player, "Updated " + friends.length + " friend(s) to role " + role + ".");
    return;
  }
  if (action === "mine") {
    const friends = selected(player, target);
    const blockId = normalizeBlockId(parts[3] || "oak_log");
    if (!friends.length) { reply(player, "No matching friend. Use !friends list."); return; }
    if (!Object.prototype.hasOwnProperty.call(MINE_DROPS, blockId)) {
      reply(player, "Supported blocks: oak_log, birch_log, spruce_log, jungle_log, acacia_log, dark_oak_log, mangrove_log, cherry_log, stone, cobblestone, coal_ore, iron_ore, copper_ore.");
      return;
    }
    let started = 0;
    for (const friend of friends) {
      if (assignMine(friend, blockId)) { setRole(friend, "miner"); setMode(friend, "follow"); started++; }
    }
    reply(player, "Assigned " + started + " friend(s) to mine nearby " + blockId.replace("minecraft:", "") + ". Each task mines up to " + MINE_LIMIT + " blocks.");
    return;
  }
  if (action === "collect") {
    const friends = selected(player, target);
    if (!friends.length) { reply(player, "No matching friend. Use !friends list."); return; }
    for (const friend of friends) { stopTask(friend); setTask(friend, "collect"); setRole(friend, "collector"); setMode(friend, "follow"); }
    reply(player, "Assigned " + friends.length + " friend(s) to collect nearby dropped items.");
    return;
  }
  if (action === "inventory") {
    const friend = findFriend(player, target);
    if (!friend) { reply(player, "No matching friend. Use !friends list."); return; }
    reply(player, displayName(friend) + "'s companion inventory: " + inventorySummary(friend));
    return;
  }
  if (action === "task" || action === "status") {
    const friend = findFriend(player, target);
    if (!friend) { reply(player, "No matching friend. Use !friends list."); return; }
    let count = Number(friend.getDynamicProperty(MINE_COUNT_KEY) || 0);
    reply(player, displayName(friend) + " — role: " + getRole(friend) + "; task: " + taskOf(friend) + (taskOf(friend) === "mine" ? "; mined this task: " + count + "/" + MINE_LIMIT : "") + ".");
    return;
  }
  if (action === "stop") {
    const friends = selected(player, target);
    if (!friends.length) { reply(player, "No matching friend."); return; }
    for (const friend of friends) stopTask(friend);
    reply(player, "Stopped tasks for " + friends.length + " friend(s).");
    return;
  }
  if (action === "remove") {
    const friends = selected(player, target);
    if (!friends.length) { reply(player, "No matching friend."); return; }
    for (const friend of friends) { try { friend.remove(); } catch {} }
    reply(player, "Removed " + friends.length + " friend(s).");
    return;
  }
  reply(player, "I don't know that command yet. Use !friends help.");
}

world.afterEvents.chatSend.subscribe(event => {
  const message = event.message.trim();
  const lower = message.toLowerCase();
  const player = event.sender;
  if (lower.startsWith("!friends") || lower.startsWith("!friend")) {
    runCommand(player, message);
    return;
  }
  // Offline intent parser only routes to features that are implemented.
  if (/\b(friends?|companions?)\b/.test(lower)) {
    if (/\b(stay|wait|stop)\b/.test(lower)) runCommand(player, "!friends stay all");
    else if (/\b(come|teleport|return)\b/.test(lower)) runCommand(player, "!friends come all");
    else if (/\b(follow|follow me)\b/.test(lower)) runCommand(player, "!friends follow all");
    else if (/\b(list|who are)\b/.test(lower)) runCommand(player, "!friends list");
    else if (/\b(collect|pick up)\b/.test(lower)) runCommand(player, "!friends collect all");
    else if (/\b(mine|chop|gather wood)\b/.test(lower)) runCommand(player, "!friends mine all oak_log");
  }
});

let taskTick = 0;
system.runInterval(() => {
  taskTick += TICK_INTERVAL;
  for (const player of world.getAllPlayers()) {
    for (const friend of allFriends(player)) {
      const task = taskOf(friend);
      if (task === "mine" || task === "collect") continue;
      if (friend.hasTag("aimf_mode_stay")) continue;
      if (friend.dimension.id !== player.dimension.id) continue;
      const a = friend.location, b = player.location;
      const dx = b.x-a.x, dz = b.z-a.z;
      const distance = Math.sqrt(dx*dx + dz*dz);
      if (distance > 18) {
        try { friend.teleport({ x: b.x+1, y: b.y, z: b.z+1 }, { dimension: player.dimension }); } catch {}
      } else if (distance > FOLLOW_DISTANCE) {
        const length = Math.max(distance, 0.001);
        try { friend.applyImpulse({ x: dx/length*FOLLOW_IMPULSE, y: 0.015, z: dz/length*FOLLOW_IMPULSE }); } catch {}
      }
    }
  }
}, TICK_INTERVAL);

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    for (const friend of allFriends(player)) {
      const task = taskOf(friend);
      if (task === "mine") {
        const result = mineTick(friend);
        if (result === "complete") reply(player, displayName(friend) + " finished the mining task. Inventory: " + inventorySummary(friend));
        else if (result === "none") {
          stopTask(friend);
          reply(player, displayName(friend) + " could not find a supported block nearby. Move closer and assign the task again.");
        }
      } else if (task === "collect") {
        const count = collectTick(friend);
        if (count > 0) reply(player, displayName(friend) + " collected " + count + " item(s). Inventory: " + inventorySummary(friend));
      }
    }
  }
}, TASK_TICK_INTERVAL);
