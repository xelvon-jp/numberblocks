# テスト

ブラウザ（Chromium）でゲームを実際に動かして確かめるテストです。
1つでも失敗すると終了コード1で終わります。

```sh
cd tests
npm install        # はじめの1回だけ
node run.js        # ぜんぶ流す（30秒ほど）
node run.js undo   # ファイル名かケース名に「undo」を含むものだけ
```

Chromium は `CHROME_PATH` → `/opt/pw-browsers` の中 → Playwright まかせ、の順にさがします。
Claude Code on the web の環境なら、そのまま動きます。

| ファイル | 見ているもの |
|---|---|
| `layout.test.js`  | どの画面サイズでも はみ出さない・重ならない |
| `task.test.js`    | おだいの手数・クリア判定・ほめことば・ヒント |
| `undo.test.js`    | もどす（3手まで） |
| `beginner.test.js`| ビギナー（1〜10のキー・記録は別・手数は見ない） |
| `profile.test.js` | ひなた と パパ の記録を混ぜない |
| `settings.test.js`| 歯車の「せってい」（大きさ・クイズ・おだい）が効く |
| `smoke.test.js`   | ひととおり動かして止まらない |

## おだいを足すとき

`index.html` の `TASKS` に1行足します。`best`・`ref`・`way` は仮の値でかまいません。

```sh
node tools/solver.js --write   # best/ref/way を計算しなおして書きかえる
node tools/solver.js --check   # 合っているか確かめる（テストでも見ている）
node tools/solver.js 777 7 10  # 1問だけ手数を見る
```

- `best` … 機械の最短手数（追い越して引く、などの裏技も使う）
- `ref`  … おてほん手数（＋ × ×2 ÷2 だけ）。「じょうず！」は ref＋2手いない
- `way`  … ビギナーの「みちしるべ」（とちゅうで作る数）。おてほんの道から自動で作る。
  自動の道がヒントの考え方とずれるときは、`tools/solver.js` の `WAY_FIX` に手で書く。
  `--check` は、みちしるべの数が その数字だけで作れることも確かめる
