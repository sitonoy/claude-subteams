#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { Command } from "commander";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "templates");

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8")
) as { version: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listTeamNames(): string[] {
  if (!fs.existsSync(templatesDir)) return [];
  return fs
    .readdirSync(templatesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getTeamTitle(team: string): string {
  const claudeMdPath = path.join(templatesDir, team, "CLAUDE.md");
  if (!fs.existsSync(claudeMdPath)) return team;
  const firstLine = fs
    .readFileSync(claudeMdPath, "utf-8")
    .split("\n")
    .find((line) => line.startsWith("# "));
  return firstLine ? firstLine.replace(/^#\s*/, "") : team;
}

function listCommand(): void {
  const teams = listTeamNames();
  if (teams.length === 0) {
    console.log("利用可能なチームテンプレートが見つかりませんでした。");
    return;
  }
  console.log("利用可能なチーム:\n");
  for (const team of teams) {
    const agentsDir = path.join(templatesDir, team, "agents");
    const agentCount = fs.existsSync(agentsDir)
      ? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length
      : 0;
    console.log(`  ${team} (${agentCount} agents) — ${getTeamTitle(team)}`);
  }
  console.log("\n導入: claude-subteams init <team名>");
}

function initCommand(team: string, options: { force?: boolean }): void {
  const teamPath = path.join(templatesDir, team);
  if (!fs.existsSync(teamPath)) {
    console.error(`チーム "${team}" は見つかりません。`);
    const available = listTeamNames();
    if (available.length > 0) {
      console.error(`利用可能なチーム: ${available.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  const agentsSrcDir = path.join(teamPath, "agents");
  const agentsDestDir = path.join(process.cwd(), ".claude", "agents");
  fs.mkdirSync(agentsDestDir, { recursive: true });

  const agentFiles = fs.existsSync(agentsSrcDir)
    ? fs.readdirSync(agentsSrcDir).filter((f) => f.endsWith(".md"))
    : [];

  for (const file of agentFiles) {
    const destPath = path.join(agentsDestDir, file);
    const exists = fs.existsSync(destPath);
    if (exists && !options.force) {
      console.log(`  スキップ: .claude/agents/${file}（既に存在。--force で上書き）`);
      continue;
    }
    fs.copyFileSync(path.join(agentsSrcDir, file), destPath);
    console.log(`  ${exists ? "上書き" : "作成"}: .claude/agents/${file}`);
  }

  const teamClaudeMdPath = path.join(teamPath, "CLAUDE.md");
  if (fs.existsSync(teamClaudeMdPath)) {
    const templateContent = fs.readFileSync(teamClaudeMdPath, "utf-8").trim();
    const startMarker = `<!-- claude-subteams:${team}:start -->`;
    const endMarker = `<!-- claude-subteams:${team}:end -->`;
    const block = `${startMarker}\n${templateContent}\n${endMarker}`;

    const rootClaudeMdPath = path.join(process.cwd(), "CLAUDE.md");
    if (!fs.existsSync(rootClaudeMdPath)) {
      fs.writeFileSync(rootClaudeMdPath, `${block}\n`, "utf-8");
      console.log("  作成: CLAUDE.md");
    } else {
      const existing = fs.readFileSync(rootClaudeMdPath, "utf-8");
      const blockPattern = new RegExp(
        `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`
      );
      if (blockPattern.test(existing)) {
        fs.writeFileSync(rootClaudeMdPath, existing.replace(blockPattern, block), "utf-8");
        console.log("  更新: CLAUDE.md（既存のチーム定義ブロックを置き換え）");
      } else {
        const separator = existing.endsWith("\n") ? "\n" : "\n\n";
        fs.writeFileSync(rootClaudeMdPath, `${existing}${separator}${block}\n`, "utf-8");
        console.log("  追記: CLAUDE.md（末尾にチーム定義ブロックを追加）");
      }
    }
  }

  console.log(`\nチーム "${team}" の導入が完了しました。`);
}

const program = new Command();

program
  .name("claude-subteams")
  .description("Claude Code用サブエージェント・チームテンプレート管理CLI")
  .version(pkg.version);

program
  .command("list")
  .description("利用可能なチームテンプレート一覧を表示する")
  .action(listCommand);

program
  .command("init")
  .argument("[team]", "導入するチーム名", "generalist")
  .option("-f, --force", "既存の agents ファイルを上書きする")
  .description("指定したチームのサブエージェント設定をカレントディレクトリに導入する")
  .action(initCommand);

program.parse();
