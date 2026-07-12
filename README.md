# claude-subteams

Claude Code用のサブエージェント・チームテンプレートを、プロジェクト間で使い回すためのCLIツール。

メインセッション（Fable）を**オーケストレーター（社長役）**、各サブエージェント（Sonnet）を**作業者**として定義したテンプレート一式を、コマンド一発でカレントディレクトリの `.claude/agents/` と `CLAUDE.md` に導入する。

## インストール

```bash
npm install -g claude-subteams
```

## 使い方

### 利用可能なチーム一覧を表示

```bash
claude-subteams list
```

### チームを導入する

```bash
cd your-project
claude-subteams init generalist
```

実行すると以下が行われる。

- `.claude/agents/` に該当チームのサブエージェント定義（`*.md`）をコピーする（同名ファイルが既にある場合はスキップ。`--force` で上書き）
- `CLAUDE.md` にチームのルーティング定義を追加する
  - `CLAUDE.md` が存在しない場合は新規作成する
  - 既に存在する場合は、既存の内容を壊さず、マーカーコメント（`<!-- claude-subteams:<team>:start/end -->`）で囲んだブロックとして末尾に追記する
  - 同じチームを再実行した場合は、マーカー間のブロックのみを更新する（重複しない）
  - 複数チームを導入した場合、それぞれ別ブロックとして共存する

### オプション

| オプション | 説明 |
|---|---|
| `-f, --force` | 既存の agents ファイルを上書きする |

## 収録チーム

| チーム名 | 対象 | サブエージェント |
|---|---|---|
| `generalist` | スタック非依存 | `planner`（計画）, `builder`（実装） |
| `next-ts` | Next.js（App Router）/ TypeScript | `architect`（設計）, `coder`（実装） |

いずれのサブエージェントも `model: sonnet` を指定しており、オーケストレーター（メインセッション / Fable）から委譲される作業者として動作する。

## チームを追加する

`src/templates/<チーム名>/` 配下に以下を用意する。

```text
src/templates/<チーム名>/
├── agents/
│   └── *.md      # frontmatterに name, description, tools, model: sonnet を指定
└── CLAUDE.md      # オーケストレーター向けルーティング定義（1行目は "# " から始める）
```

追加後、`npm run build` でテンプレートが `dist/templates/` にコピーされ、`claude-subteams list` / `init` から利用できるようになる。

## 開発

```bash
npm install
npm run build   # tsc + テンプレートのdistへのコピー
node dist/index.js list
```
