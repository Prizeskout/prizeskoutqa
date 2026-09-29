import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  "AGENTS.md",
  "docs/implementation/README.md",
  "docs/implementation/00-product-charter.md",
  "docs/implementation/01-current-state.md",
  "docs/implementation/02-roadmap.md",
  "docs/implementation/03-architecture-contracts.md",
  "docs/implementation/04-integration-register.md",
  "docs/implementation/05-deployment-register.md",
  "docs/implementation/06-decision-log.md",
  "docs/implementation/07-risk-register.md",
  "docs/implementation/08-verification-runbook.md",
  "docs/implementation/09-session-log.md",
  "docs/implementation/state.yaml",
];

const failures: string[] = [];
for (const file of required) {
  if (!existsSync(resolve(root, file))) failures.push(`Missing required continuity file: ${file}`);
}

const statePath = resolve(root, "docs/implementation/state.yaml");
if (existsSync(statePath)) {
  const state = readFileSync(statePath, "utf8");
  const taskMatch = state.match(/^current_task:\s*([^\s#]+)\s*$/m);
  const packetMatch = state.match(/^current_task_packet:\s*(.+?)\s*$/m);
  if (!taskMatch) failures.push("state.yaml has no current_task");
  if (!packetMatch) failures.push("state.yaml has no current_task_packet");
  if (packetMatch) {
    const packet = packetMatch[1].replace(/^['"]|['"]$/g, "");
    if (!existsSync(resolve(root, packet))) failures.push(`Current task packet does not exist: ${packet}`);
  }
  const phaseBlock = state.match(/^phases:\s*$([\s\S]*?)^tasks:\s*$/m)?.[1] ?? "";
  const inProgress = [...phaseBlock.matchAll(/^\s{4}status:\s*in_progress\s*$/gm)].length;
  if (inProgress > 1) failures.push(`More than one phase is marked in_progress (${inProgress})`);
}

const packetDir = resolve(root, "docs/implementation/task-packets");
if (existsSync(packetDir)) {
  const packets = readdirSync(packetDir).filter((file) => file.endsWith(".md"));
  if (packets.length === 0) failures.push("No implementation task packets exist");
  for (const file of packets) {
    const body = readFileSync(resolve(packetDir, file), "utf8");
    if (!/^## Exact next action$/m.test(body)) failures.push(`${file} has no Exact next action section`);
    if (!/^## (Acceptance criteria|Known status)$/m.test(body)) failures.push(`${file} lacks status or acceptance criteria`);
  }
}

if (failures.length > 0) {
  console.error("Continuity verification failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Continuity verification passed.");
