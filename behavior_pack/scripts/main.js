import { world, system } from "@minecraft/server";

const ENTITY_ID = "aimf:friend";
const MAX_FRIENDS = 8;
const TICK_INTERVAL = 10;
const FOLLOW_DISTANCE = 2.4;
const SPEED = 0.055;
const DIMENSIONS = ["overworld", "nether", "the_end"];

function safeName(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 16);
}
function ownerTag(player) { return "aimf_owner_" + safeName(player.name).toLowerCase(); }
function friendNameTag(name) { return "aimf_name_" + safeName(name).toLowerCase(); }
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
  return allFriends(player).find(e => e.getTags().some(t => t.startsWith("aimf_name_") && t.slice(10) === wanted));
}
function displayName(entity) {
  const tag = entity.getTags().find(t => t.startsWith("aimf_name_"));
  return tag ? tag.slice(10) : entity.nameTag || "Friend";
}
function reply(player, message) { try { player.sendMessage("§b[AI Friends]§r " + message); } catch {} }
function setMode(entity, mode) {
  entity.removeTag("aimf_mode_follow");
  entity.removeTag("aimf_mode_stay");
  entity.addTag("aimf_mode_" + mode);
}
function spawnFriend(player, name) {
  const clean = safeName(name) || "Friend";
  const current = allFriends(player);
  if (current.length >= MAX_FRIENDS) { reply(player, "Limit reached: " + MAX_FRIENDS + " companions per player for this performance profile."); return; }
  if (findFriend(player, clean)) { reply(player, "A friend named " + clean + " already exists. Choose another name."); return; }
  const p = player.location;
  const angle = Math.random() * Math.PI * 2;
  const location = { x: p.x + Math.cos(angle) * 2, y: p.y, z: p.z + Math.sin(angle) * 2 };
  try {
    const entity = player.dimension.spawnEntity(ENTITY_ID, location);
    entity.addTag(ownerTag(player));
    entity.addTag(friendNameTag(clean));
    entity.addTag("aimf_mode_follow");
    entity.nameTag = clean;
    reply(player, "Spawned " + clean + ". (" + (current.length + 1) + "/" + MAX_FRIENDS + ")");
  } catch (error) {
    reply(player, "Could not spawn companion. Check that both packs are enabled. " + String(error).slice(0, 100));
  }
}
function selected(player, target) {
  if (!target || target.toLowerCase() === "all") return allFriends(player);
  const found = findFriend(player, target);
  return found ? [found] : [];
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
    reply(player, "Commands: !friends spawn <name|count>, list, follow <name|all>, stay <name|all>, come <name|all>, rename <old> <new>, remove <name|all>.");
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
    reply(player, list.length ? "Your friends: " + list.map(e => displayName(e) + " (" + (e.hasTag("aimf_mode_stay") ? "staying" : "following") + ")").join(", ") : "You have no friends. Use !friends spawn Alex.");
    return;
  }
  if (action === "follow" || action === "stay" || action === "come") {
    const friends = selected(player, target);
    if (!friends.length) { reply(player, "No matching friend. Use !friends list."); return; }
    for (const friend of friends) {
      setMode(friend, action === "stay" ? "stay" : "follow");
      if (action === "come") {
        try { friend.teleport({x:player.location.x+1,y:player.location.y,z:player.location.z+1},{dimension:player.dimension}); } catch {}
      }
    }
    reply(player, friends.length + " friend(s) set to " + (action === "come" ? "come/follow" : action) + ".");
    return;
  }
  if (action === "rename") {
    const oldName = parts[2], newName = safeName(parts[3]);
    const friend = findFriend(player, oldName);
    if (!friend || !newName) { reply(player, "Usage: !friends rename <oldName> <newName>"); return; }
    friend.removeTag(friendNameTag(oldName));
    friend.addTag(friendNameTag(newName));
    friend.nameTag = newName;
    reply(player, oldName + " is now " + newName + ".");
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
  // Small offline intent parser. It intentionally supports only implemented actions.
  if (/\b(friends?|companions?)\b/.test(lower)) {
    if (/\b(stay|wait|stop)\b/.test(lower)) runCommand(player, "!friends stay all");
    else if (/\b(come|teleport|return)\b/.test(lower)) runCommand(player, "!friends come all");
    else if (/\b(follow|follow me)\b/.test(lower)) runCommand(player, "!friends follow all");
    else if (/\b(list|who are)\b/.test(lower)) runCommand(player, "!friends list");
  }
});

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    for (const friend of allFriends(player)) {
      if (friend.hasTag("aimf_mode_stay")) continue;
      if (friend.dimension.id !== player.dimension.id) continue;
      const a = friend.location, b = player.location;
      const dx = b.x-a.x, dz = b.z-a.z;
      const distance = Math.sqrt(dx*dx + dz*dz);
      if (distance > 18) {
        try { friend.teleport({x:b.x+1,y:b.y,z:b.z+1},{dimension:player.dimension}); } catch {}
      } else if (distance > FOLLOW_DISTANCE) {
        const length = Math.max(distance, 0.001);
        try { friend.applyImpulse({x:(dx/length)*SPEED,y:0.015,z:(dz/length)*SPEED}); } catch {}
      }
    }
  }
}, TICK_INTERVAL);
