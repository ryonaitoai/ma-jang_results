# セキュリティ・データ整合性レビュー — 2026-03-07

## レビュー概要

- **対象**: 雀録（JanRoku）全コード
- **観点**: セキュリティ、データ整合性、競合状態、データ復旧可能性
- **レビュアー**: Claude Opus 4.6（セキュリティ・データ整合性特化レビュー）
- **対象ファイル数**: APIルート12本、画面10本、ライブラリ4本、スキーマ1本

## レビュー範囲

| Step | 対象 | 結果 |
|------|------|------|
| Step 1 | プロジェクト構造・DB設定 | 問題2件発見 |
| Step 2 | データ書き込み経路（API全数チェック） | 致命的4件、重要5件 |
| Step 3 | データ読み取り整合性 | 重要1件、軽微1件 |
| Step 4 | 清算ロジック | 重要3件 |
| Step 5 | ポイント計算 | 重要1件（既出再確認）、軽微1件 |
| Step 6 | レーティングシステム | 未実装のため該当なし |
| Step 7 | 同時アクセス・競合状態 | 致命的1件、重要2件、軽微1件 |
| Step 8 | データ復旧可能性 | 重要3件、軽微1件 |

---

## 🔴 致命的（即座に修正が必要）— 5件

### 🔴-1: スコア更新のDELETE→INSERTがトランザクションなし — スコア消失リスク

- **場所**: `src/app/api/sessions/[id]/hanchan/[hanchanId]/route.ts` 52-108行目
- **問題**: スコア更新時に、まず既存の `hanchanScores` を全DELETE（52行目）し、その後に新しいスコアを1件ずつINSERTしている（63-78行目）。これがトランザクションで囲まれていないため、DELETE成功後にINSERTが途中で失敗すると、**その半荘のスコアが全て消失する**。
- **再現条件**: スコア編集中にネットワークエラー、Tursoの一時障害、またはサーバーの再起動が発生した場合。
- **影響**: 対局中にスコアが消え、清算計算が不正になる。operation_logにも失敗前の変更は記録されない（ログINSERTはスコアINSERTの後）。
- **修正案**: `db.transaction()` でDELETE→INSERT→ログINSERTを囲む。または、DELETE前に旧データをバックアップして、失敗時にロールバックする。

### 🔴-2: セッション更新APIにバリデーションが一切ない（Mass Assignment）

- **場所**: `src/app/api/sessions/[id]/route.ts` 62-63行目
- **問題**: `body` をそのまま `db.update(sessions).set(body)` に渡している。クライアントから `{ status: 'active' }` を送れば清算済みセッションを再度activeに戻せる。`{ id: '...' }` でIDの上書きも可能。
- **再現条件**: 任意のHTTPクライアント（curl等）でPUTリクエストを送信。
- **影響**: 清算済みセッションのステータスを不正に変更してデータの整合性を破壊できる。セキュリティ上もMass Assignment脆弱性。
- **修正案**: 許可するフィールドをホワイトリスト化する（`memo`, `chipEnabled` 等のみ）。`status`, `id`, `createdAt` 等は変更不可にする。

### 🔴-3: 半荘作成がトランザクションなし — 半荘レコードだけ残りスコアなしになりうる

- **場所**: `src/app/api/sessions/[id]/hanchan/route.ts` 73-116行目
- **問題**: `hanchan` テーブルへのINSERT → `hanchanScores` への複数INSERT → `operationLogs` へのINSERT が逐次実行でトランザクションなし。hanchanレコードは作成されたがスコアが1つも保存されない状態が起きうる。
- **再現条件**: 5人セッション（4件のスコアINSERT）の途中でDB接続が切れた場合。
- **影響**: スコアのない半荘が帳表に表示される。次の半荘番号がずれる。清算計算でも空の半荘が混入する可能性。
- **修正案**: `db.transaction()` で一連の操作を囲む。

### 🔴-4: 清算処理がトランザクションなし — 部分的な清算データが残りうる

- **場所**: `src/app/api/sessions/[id]/settle/route.ts` 101-141行目
- **問題**: settlements INSERT（5人分ループ）→ settlementTransfers INSERT（複数件ループ）→ sessions UPDATE（statusを'settled'に）→ operationLogs INSERT がすべてトランザクションなし。settlements が一部だけINSERTされてsessions.statusが更新されない状態が発生しうる。
- **再現条件**: 清算ボタン押下直後にサーバーエラーまたはタイムアウト。
- **影響**: 部分的な清算データが残り、再度清算しようとすると既存データと重複する。`status !== 'settled'` なので再清算は可能だが、settlements テーブルに二重のデータが入る。
- **修正案**: `db.transaction()` で囲む。さらに、清算前に既存のsettlements/transfersを削除するか、冪等性を確保する。

### 🔴-5: 清算APIにTOCTOU競合 — 二重清算が発生しうる

- **場所**: `src/app/api/sessions/[id]/settle/route.ts` 34-35行目
- **問題**: `session.status === 'settled'` のチェック（34行目）と、`status: 'settled'` への更新（130行目）の間に時間差がある（TOCTOU: Time-of-check to time-of-use）。2つのクライアントがほぼ同時に清算ボタンを押すと、両方が `status === 'active'` を読み取り、両方がsettlements/transfersをINSERTする。
- **再現条件**: 2つのブラウザタブで同一セッションの清算画面を開き、同時に「清算を確定する」を押す。
- **影響**: settlements テーブルにメンバーごとに2レコードが作成される。清算結果表示が二重になり、送金額が2倍に見える。DBの一貫性が破壊される。
- **修正案**: トランザクション内で `UPDATE sessions SET status = 'settled' WHERE id = ? AND status = 'active'` を実行し、affected rows が 0 なら中断する（楽観的ロック）。

---

## 🟡 重要（早期に修正すべき）— 14件

### 🟡-1: スコア更新・半荘無効化でセッションステータスチェックがない

- **場所**: `src/app/api/sessions/[id]/hanchan/[hanchanId]/route.ts` PUT/DELETE
- **問題**: PUTではセッションを取得してルール情報を参照しているが、`session.status !== 'active'` チェックがない。DELETEではセッションの取得すら行っていない。清算済みセッションのスコアを変更・無効化できてしまう。
- **影響**: 清算後にスコアを変更すると、清算結果との整合性が崩れる。

### 🟡-2: ポイント入力モードで合計値のバリデーションがない

- **場所**: `src/app/api/sessions/[id]/hanchan/route.ts` 64-99行目
- **問題**: `inputMode === 'point'` のとき、ポイントの合計が0であるかのチェックがない（`raw_score` モードでは `validateScoreTotal` が呼ばれている）。不正な合計のポイントがDBに保存される。
- **影響**: 入力ミスに気づかずに清算まで進んだ場合、収支が合わなくなる。

### 🟡-3: セッション作成でmemberIdsの存在確認がない

- **場所**: `src/app/api/sessions/route.ts` 78-114行目
- **問題**: `memberIds` 配列の中身が実在するメンバーのIDかどうかを確認していない。存在しないIDや空文字列でもsessionMembersに保存される。本番ではforeign_keysが無効なのでDB側でも弾かれない。
- **影響**: 幽霊メンバーを含むセッションが作成される可能性。

### 🟡-4: セッション作成がトランザクションなし

- **場所**: `src/app/api/sessions/route.ts` 86-114行目
- **問題**: sessionsテーブルINSERT → sessionMembersテーブル複数INSERT がトランザクションなし。
- **影響**: メンバーが不完全なセッションが作成される可能性。

### 🟡-5: メンバー追加時にoperation_logが記録されない

- **場所**: `src/app/api/sessions/[id]/members/route.ts`
- **問題**: セッション中にメンバーが追加されても操作ログに記録されない。

### 🟡-6: `members.sort()` が状態を直接ミューテートしている

- **場所**: `src/app/sessions/[id]/page.tsx` 85行目, `src/app/sessions/[id]/view/page.tsx` 108行目
- **問題**: `session.members.sort()` がReactの状態オブジェクトを直接変更している。
- **修正案**: `[...session.members].sort(...)` にする。

### 🟡-7: 清算の冪等性がない — 部分失敗時に二重データが作成される

- **場所**: `src/app/api/sessions/[id]/settle/route.ts` 101-131行目
- **問題**: 清算APIが途中で失敗した場合、再実行でsettlementsテーブルに二重データ。
- **修正案**: トランザクション導入に加え、清算開始時に既存データをDELETEするか、UNIQUE制約を追加。

### 🟡-8: ポイント合計のゼロサム保証がない（清算時）

- **場所**: `src/app/api/sessions/[id]/settle/route.ts` 86-93行目
- **問題**: 各メンバーの `totalPoint` を個別に `Math.round(... * rateValue)` するため、浮動小数点精度の問題で全メンバーの `amount` 合計が ±1 円ずれる可能性がある。
- **修正案**: 全メンバーの金額合計を計算し、差分を1位のメンバーに加減する調整ロジックを追加。

### 🟡-9: `calculateSettlementAmounts` 関数が未使用でロジックが3箇所に分散

- **場所**: `src/lib/mahjong/settlement.ts` 73-95行目
- **問題**: 定義されているが未使用。settle APIとsettlement画面でインライン実装。さらに未使用関数のchip計算式が実際のAPIと異なる。
- **影響**: メンテナンス上のリスク。

### 🟡-10: 半荘番号のUNIQUE制約なし

- **場所**: `src/app/api/sessions/[id]/hanchan/route.ts` 55-59行目 + `src/db/schema.ts`
- **問題**: `hanchanNumber` を `COUNT(*) + 1` で算出しているが、スキーマに `(sessionId, hanchanNumber)` のUNIQUE制約がない。同時追加で同番号が発生しうる。

### 🟡-11: 書き込み中にポーリングすると中間状態のデータが返る

- **場所**: `src/app/api/sessions/[id]/scores/route.ts` + `hanchan/route.ts`
- **問題**: 半荘作成がトランザクションなしのため、書き込み中のポーリングでスコア0件の半荘が返る。
- **影響**: 閲覧者の画面に一瞬、スコアのない半荘が表示される。次回ポーリング（5秒後）で解消。

### 🟡-12: 半荘無効化のログにスコアデータが含まれない

- **場所**: `src/app/api/sessions/[id]/hanchan/[hanchanId]/route.ts` 142-145行目
- **問題**: `delete_hanchan` のペイロードには `hanchanId` のみ。スコアデータが含まれない。

### 🟡-13: セッション作成・メンバー追加のログが存在しない

- **場所**: `src/app/api/sessions/route.ts`, `src/app/api/sessions/[id]/members/route.ts`
- **問題**: セッション構成の変更履歴を追跡できない。

### 🟡-14: スコア更新ログに更新前データが含まれない

- **場所**: `src/app/api/sessions/[id]/hanchan/[hanchanId]/route.ts` 112-119行目
- **問題**: 更新後のデータのみ記録。誤操作の取り消しができない。

---

## 🟢 軽微（改善推奨）— 4件

### 🟢-1: スコア色の不一致（帳表テーブル本体のみ）

- **場所**: `src/app/sessions/[id]/page.tsx` 302-303行目
- **問題**: セッション帳表のテーブル本体が `text-game-gold`、閲覧モードでは `text-game-green`。

### 🟢-2: 極端な値の範囲チェックがない

- **場所**: `src/app/sessions/[id]/input/page.tsx` 199行目
- **問題**: テンキーで6桁まで入力可能。UIで警告は出るが入力制限なし。

### 🟢-3: サーバー側の冪等性チェックがない

- **問題**: クライアント側の `isSubmitting` はブラウザ内の状態。サーバー側にリクエスト重複検知なし。

### 🟢-4: ログINSERT失敗でメイン処理がエラーに見える

- **問題**: ログINSERTが失敗するとメイン処理全体がエラーレスポンスを返すが、メイン処理のデータは既に保存されている（トランザクションがないため）。再送信するとデータが二重になる。

---

## インフラレベルの問題

### Tursoでforeign_keysが有効化されていない

- **場所**: `src/db/index.ts` 6-11行目
- **問題**: Turso（本番）パスでは `PRAGMA foreign_keys = ON` が設定されていない。外部キー制約が機能しない。
- **影響**: 存在しないmember_idやsession_idのデータがDBに保存される可能性。

### ローカルモードのPRAGMAがawaitされていない

- **場所**: `src/db/index.ts` 25-28行目
- **問題**: `localClient.execute()` が3回呼ばれているが `await` されていない。最初のクエリ実行時にPRAGMAが有効化されていない可能性。
- **影響**: ローカル開発のみ。本番には影響なし。

---

## 確認済み（問題なし）

| 項目 | 確認結果 |
|------|----------|
| 全エンドポイントのtry-catch | 全て実装済み |
| 半荘作成時のセッションステータスチェック | `status !== 'active'` で拒否 |
| 清算の二重実行防止（通常操作時） | `status === 'settled'` チェックあり |
| メンバー重複追加防止 | 既存チェックあり |
| 操作ログの記録（4操作タイプ） | create/update/delete/settle すべて記録 |
| 論理削除の使用 | メンバー(isActive)、半荘(isVoid)ともに物理削除なし |
| データソースの一致 | 帳表・閲覧モード・清算で同一DB参照 |
| トータル計算の一致 | クライアント/サーバーで同一ロジック |
| ウマ・オカ計算の正しさ | 数学的に証明済み（合計=0） |
| 素点入力の合計バリデーション | 厳密一致チェックあり |
| トップ自動計算の正しさ | `-(他3人合計)` で合計0を保証 |
| 同点時の順位決定 | 座順で決定（標準的） |
| NaN防止 | `parseFloat(input) \|\| 0` で変換 |
| ネッティングアルゴリズム | 数学的に正しい |
| クライアント側の二重送信防止 | isSubmitting/isSettling + disabled |
| 複数端末のポーリング | 読み取り専用で安全 |

---

## 優先修正順の推奨

### 最優先（対局中のデータ消失防止）
1. 全書き込みAPIに `db.transaction()` を導入（🔴-1, 🔴-3, 🔴-4 を一括解決）
2. 清算APIに楽観的ロックを追加（🔴-5）
3. セッション更新APIのホワイトリスト化（🔴-2）

### 次点（データ整合性の強化）
4. スコア更新/削除にセッションステータスチェック追加（🟡-1）
5. ポイント入力モードのサーバー側合計バリデーション（🟡-2）
6. Tursoでforeign_keys有効化
7. 清算の冪等性確保（🟡-7）
8. 半荘番号のUNIQUE制約追加（🟡-10）

### 改善（品質向上）
9. 操作ログの充実化（🟡-5, 🟡-12, 🟡-13, 🟡-14）
10. 計算ロジックの集約（🟡-9）
11. React状態ミューテーションの修正（🟡-6）
12. UIの軽微な修正（🟢-1, 🟢-2）
