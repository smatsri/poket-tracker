import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = "smatsri/poket-tracker";
const projectOwner = "smatsri";
const projectNumber = 8;
const ticketsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tickets");

const statusToColumn = {
  todo: "Todo",
  "in-progress": "In Progress",
  done: "Done",
};

function gh(args) {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  if (result.error) {
    throw new Error(
      "GitHub CLI is not available. Install it from https://cli.github.com/ and reopen the terminal.",
    );
  }
  if (result.status !== 0) {
    throw new Error(`gh ${args.join(" ")}\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function parseTicket(fileName) {
  const text = readFileSync(path.join(ticketsDir, fileName), "utf8");
  const status = text.match(/^\*\*Status:\*\*\s*(\S+)/m)?.[1];
  const issue = text.match(/^\*\*Issue:\*\*\s*#(\d+)/m)?.[1];
  const title = text.match(/^#\s+(TKT-\d+)\s+—\s+(.+)$/m);
  if (!title) {
    throw new Error(`${fileName} is missing a TKT heading`);
  }
  if (!status || !statusToColumn[status]) {
    throw new Error(`${fileName} has status "${status || ""}". Use todo, in-progress, or done.`);
  }
  if (!issue) {
    throw new Error(`${fileName} is missing **Issue:** #N`);
  }
  return {
    fileName,
    id: title[1],
    status,
    number: Number(issue),
  };
}

const tickets = readdirSync(ticketsDir)
  .filter((name) => /^TKT-\d+.+\.md$/.test(name))
  .sort()
  .map(parseTicket);

for (const ticket of tickets) {
  const url = `https://github.com/${repo}/issues/${ticket.number}`;
  const state = JSON.parse(
    gh(["issue", "view", String(ticket.number), "--repo", repo, "--json", "state"]),
  ).state;

  if (ticket.status === "done" && state === "OPEN") {
    gh([
      "issue",
      "close",
      String(ticket.number),
      "--repo",
      repo,
      "--reason",
      "completed",
      "--comment",
      `Closed from tickets/${ticket.fileName} because its status is done.`,
    ]);
    console.log(`${ticket.id} closed #${ticket.number}`);
  } else if (ticket.status !== "done" && state === "CLOSED") {
    gh([
      "issue",
      "reopen",
      String(ticket.number),
      "--repo",
      repo,
      "--comment",
      `Reopened from tickets/${ticket.fileName} because its status is ${ticket.status}.`,
    ]);
    console.log(`${ticket.id} reopened #${ticket.number}`);
  }

  gh([
    "project",
    "item-edit",
    String(projectNumber),
    "--owner",
    projectOwner,
    "--url",
    url,
    "--field",
    "Status",
    "--value",
    statusToColumn[ticket.status],
  ]);
  console.log(`${ticket.id} #${ticket.number} -> ${statusToColumn[ticket.status]}`);
}
