# デザイン統一指示: レトロ麻雀ゲーム風UI

> この指示に従い、アプリ全体のデザインを「ファミコン〜PS1時代の麻雀ゲーム」風に統一してください。
> 既存の機能やロジックは一切変更せず、見た目（CSS/Tailwind/コンポーネントの装飾部分）のみを修正します。

---

## コンセプト

**「平成初期の麻雀ゲームの対局画面・リザルト画面をスマホアプリとして現代に蘇らせる」**

参考イメージ: ファミコンの「4人打ち麻雀」、スーファミの「スーパー麻雀大会」、PS1の「麻雀やろうぜ!」などの対局画面やリザルト画面。深い緑のフェルト感のある背景に、くっきりとした白・黄色・赤の文字、角張ったウィンドウ枠。ただしドット絵そのものではなく、あの雰囲気を現代のUIとして再解釈する。

---

## カラーパレット

### 基本色（tailwind.config.ts の colors に定義）

```typescript
colors: {
  // 背景系 — 麻雀卓のフェルト感
  'felt': {
    900: '#0a1a10',  // 最深背景（ナビバー、全体背景）
    800: '#0f2418',  // メイン背景
    700: '#163020',  // カード・パネル背景
    600: '#1e3d2a',  // ホバー・アクティブ背景
    500: '#2a5438',  // ボーダー・区切り線
  },
  // テキスト系
  'game': {
    white: '#f0f0e8',    // メインテキスト（少しクリーム寄りの白）
    gold: '#ffd700',     // 強調・1着・プラス収支・タイトル
    red: '#ff4444',      // マイナス収支・4着・警告
    cyan: '#00e5ff',     // 2着・情報ハイライト
    green: '#44ff88',    // アクセント・成功・確定ボタン
    orange: '#ff9900',   // 3着・注意
    muted: '#6b8068',    // 補助テキスト・非アクティブ
    dim: '#3d5c45',      // さらに薄いテキスト
  },
  // UI要素
  'frame': {
    outer: '#4a7a5a',    // ウィンドウ外枠（明るいグリーン）
    inner: '#2a4a34',    // ウィンドウ内枠
    glow: '#44ff8844',   // 枠のグロー効果（半透明）
  }
}
```

### 順位カラールール（全画面で統一）
- **1着**: `game-gold` (#ffd700) — 金色
- **2着**: `game-cyan` (#00e5ff) — シアン
- **3着**: `game-orange` (#ff9900) — オレンジ
- **4着**: `game-red` (#ff4444) — 赤

---

## フォント

### Google Fonts の読み込み（layout.tsx の `<head>` に追加）

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@400;500;700;900&family=M+PLUS+1+Code:wght@400;700&display=swap" rel="stylesheet">
```

### tailwind.config.ts の fontFamily 設定

```typescript
fontFamily: {
  // メインフォント — 角ゴシックでゲームっぽいが読みやすい
  game: ['"M PLUS 1"', 'sans-serif'],
  // 数字専用 — 等幅でスコアが揃う
  mono: ['"M PLUS 1 Code"', 'monospace'],
}
```

### 使い分けルール
- **本文・ラベル・ボタン**: `font-game` / weight 500
- **タイトル・見出し**: `font-game` / weight 700-900
- **スコア・ポイント・金額などの数字**: `font-mono` / weight 700
- **大きなスコア表示**: `font-mono` / weight 700 / text-2xl以上

---

## ウィンドウ・カード・パネルのスタイル

### 「ゲームウィンドウ」コンポーネント

レトロ麻雀ゲームの最大の特徴は **二重枠のウィンドウ** 。全てのカード・パネル・モーダルにこのスタイルを適用する。

```css
/* GameWindow — 全てのカード・パネルの基本スタイル */
.game-window {
  background: #163020;
  border: 2px solid #4a7a5a;        /* 外枠: 明るいグリーン */
  outline: 1px solid #2a4a34;       /* 内枠: 暗いグリーン */
  outline-offset: -4px;
  box-shadow:
    0 0 8px rgba(68, 255, 136, 0.1),  /* 外側のほのかなグロー */
    inset 0 1px 0 rgba(255,255,255,0.05); /* 上辺のハイライト */
  border-radius: 2px;               /* 角丸は最小限（レトロ感） */
}
```

Tailwindで表現する場合の実装例（コンポーネント化推奨）:

```tsx
// components/ui/GameWindow.tsx
function GameWindow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`
      bg-felt-700 
      border-2 border-frame-outer 
      shadow-[0_0_8px_rgba(68,255,136,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]
      rounded-sm
      relative
      ${className || ''}
    `}>
      {/* 内枠 */}
      <div className="absolute inset-[3px] border border-frame-inner rounded-sm pointer-events-none" />
      <div className="relative p-3">
        {children}
      </div>
    </div>
  );
}
```

### 適用箇所
- スコアボード → GameWindow
- メンバーカード → GameWindow
- 入力画面のパネル → GameWindow
- 清算結果パネル → GameWindow
- モーダル/ダイアログ → GameWindow + 半透明オーバーレイ
- ナビゲーションバー → GameWindowの枠スタイルを上辺のみ適用

---

## ナビゲーションバー（下部タブ）

```
┌──────────────────────────────────────────┐
│  🏠 ホーム  🀄 対局  📜 履歴  📊 分析  ⚙ 設定  │
└──────────────────────────────────────────┘
```

- 背景: `felt-900` に上辺ボーダー `frame-outer`
- 非アクティブタブ: `game-muted` 色
- アクティブタブ: `game-gold` 色 + 下に2pxの金色バー
- アイコンは現在のLucide Reactアイコンのままで良い（絵文字に変える必要なし）
- タブ切替時に一瞬だけ金色に光るフラッシュアニメーション

---

## スコアボード（帳表）のスタイル

### ランキングエリア（画面上部の順位表示）

現在の横並び表示を維持しつつ、以下を適用:

- 各メンバーの枠を `GameWindow` スタイルに
- 順位番号の色を順位カラールールに従って適用
- ポイント表示:
  - プラス: `game-gold` + `font-mono font-bold`
  - マイナス: `game-red` + `font-mono font-bold`
  - ゼロ: `game-muted`
- 金額表示（¥）: ポイントの下に `text-xs game-muted`
- 1着のメンバー枠だけ、枠の色を `game-gold` に変える（王冠感）

### 半荘一覧テーブル

- テーブルヘッダー: `felt-600` 背景、`game-muted` テキスト
- 行の区切り: `felt-500` の1pxボーダー（太い罫線は使わない）
- 半荘番号: `game-cyan` で左端に表示
- スコアセル: `font-mono` で右寄せ、プラス/マイナスで色分け
- ホバー行: `felt-600` 背景に変化
- トータル行: `felt-600` 背景 + `font-bold` + 上ボーダーを太く

---

## ボタンスタイル

### プライマリボタン（確定・保存等）

```css
.btn-primary {
  background: linear-gradient(180deg, #44ff88 0%, #2a9d55 100%);
  color: #0a1a10;
  font-weight: 700;
  border: 2px solid #66ffaa;
  box-shadow:
    0 2px 0 #1a6b38,           /* 下の影（押せる感） */
    0 0 12px rgba(68,255,136,0.3); /* グロー */
  border-radius: 2px;
  text-shadow: 0 1px 0 rgba(255,255,255,0.3);
}

.btn-primary:active {
  transform: translateY(2px);
  box-shadow: 0 0 8px rgba(68,255,136,0.2);
}
```

### セカンダリボタン（キャンセル・戻る等）

```css
.btn-secondary {
  background: transparent;
  color: #6b8068;
  border: 1px solid #3d5c45;
  border-radius: 2px;
}
```

### 危険ボタン（削除等）

```css
.btn-danger {
  background: linear-gradient(180deg, #ff4444 0%, #cc2222 100%);
  color: #fff;
  border: 2px solid #ff6666;
  box-shadow: 0 2px 0 #991111;
  border-radius: 2px;
}
```

### 共通ルール
- すべてのボタンに `border-radius: 2px`（角丸は最小限）
- 押した時に `translateY(2px)` で沈む演出
- 重要なボタンにはほのかなグロー（box-shadow）

---

## テンキー（スコア入力）

- 背景: `felt-800`
- キーボタン: `felt-600` 背景、`game-white` テキスト、`border-1 frame-inner`
- キー押下時: `felt-500` + わずかに明るく
- `±` ボタン: フル幅、`game-gold` テキスト、`felt-600` 背景
- `⌫` ボタン: `game-red` テキスト
- 入力表示エリア: `felt-900` 背景に `font-mono text-2xl`

---

## アニメーション・演出

### スコア更新時
- 新しい半荘が追加された時: 行が上からスライドイン（duration: 300ms）
- ポイント数字の変化: 数字が一瞬大きくなって戻る（scale 1 → 1.1 → 1, duration: 200ms）

### 清算画面
- 清算結果の各行が上から順にフェードイン（stagger: 100ms）
- 金額表示が0からカウントアップするアニメーション

### 順位変動
- 順位が変わった時、該当メンバーの枠が一瞬光る

### 画面遷移
- ページ遷移は軽いフェード（duration: 150ms）で十分。派手なトランジションは不要

---

## 画面ごとの追加演出

### ホーム画面
- 「雀録」のタイトルロゴ: `font-game font-black text-3xl game-gold` に微かなtext-shadow
  - `text-shadow: 0 0 10px rgba(255,215,0,0.5), 0 2px 0 #996600`
- 進行中セッションがある場合: 「対局中」バッジが点滅（opacity 0.7 ↔ 1.0, 1秒周期）

### 清算画面
- 最終結果の1着メンバー: 名前の横に `👑` + `game-gold` で強調
- 送金指示の矢印: `→` を `game-cyan` で表示

### レーティング画面
- レーティング値: `font-mono text-xl`
- ランク名（雀聖、雀豪等）: `game-gold` で、ランクに応じて色を変える
  - 雀聖: `game-gold` + グロー
  - 雀豪: `game-cyan`
  - 雀傑: `game-green`
  - 雀士以下: `game-white`

---

## 実装手順

以下の順序で進めてください。各ステップ完了後に確認を取ること。

### Step 1: 設定ファイルの更新
1. `tailwind.config.ts` にカラーパレットとフォント設定を追加
2. `layout.tsx` にGoogle Fontsの読み込みを追加
3. `globals.css` にベースとなるCSS変数とユーティリティクラスを追加

### Step 2: 共通コンポーネント作成
1. `GameWindow` コンポーネントを作成（上記仕様の通り）
2. ボタンコンポーネント（Primary / Secondary / Danger）を作成
3. 数字表示コンポーネント（プラス/マイナス色分け付き）を作成

### Step 3: レイアウトとナビゲーション
1. 下部タブバーにスタイル適用
2. ページヘッダーにスタイル適用
3. 全体の背景色を `felt-800` に統一

### Step 4: 各画面のスタイル適用
1. ホーム画面
2. セッション画面（帳表） — 最も重要
3. スコア入力画面（テンキー）
4. 清算画面
5. メンバー一覧・個人成績
6. 履歴・分析画面

### Step 5: アニメーション追加
1. スコア更新アニメーション
2. 清算カウントアップ
3. 画面遷移フェード

**注意**: 各ステップは1つずつ実行し、ブラウザで表示を確認してから次に進むこと。一度に全画面を変更しようとしないこと。
