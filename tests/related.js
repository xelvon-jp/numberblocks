// かえた ファイル から、かんけいする テスト だけを えらぶ（node run.js --changed）。
//
//   node run.js --changed            まだ コミット して いない かわり（＋ あたらしい ファイル）に かんけいする テスト
//   node run.js --changed=origin/main  origin/main から の かわり ぜんぶ に かんけいする テスト
//   node run.js --changed --list     えらんだ テストを 見せる だけ（ながさない）
//
// きまり（うえから じゅんに）：
//   1. ゲームの ほんたい（index.html・engine.js など）を かえたら ぜんぶ。どこに きくか わからないので。
//   2. RULES に ある ファイルは そこに かいた テスト。
//   3. tests/○○.test.js を かえたら その テスト。
//   4. かいた もの（.md）・え（.png）は なし。
//   5. ほかの ファイルは、その ファイル名を なかで つかって いる テスト。それも なければ ぜんぶ（あんぜんの ため）。
// あたらしい ページを たしたら RULES に 1ぎょう たす。
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');

const ALL = ['index.html', 'engine.js', 'overrides.js', 'num.js', 'tests/run.js', 'tests/package.json', 'tests/related.js'];
const RULES = {
  'waru.html': ['waru'],
  'hanbun.html': ['hanbun'],
  'mizu.js': ['hanbun', 'lab'],
  'lab.html': ['lab'],
  'lab-sankaku.html': ['lab'],
  'lab-menseki.html': ['lab', 'katachi'], 'katachi.js': ['katachi'], 'kata.js': ['katachi', 'lab'],
  'kenban.html': ['kenban'], 'oto.html': ['kenban'], 'tools/replay.js': ['kenban'], 'tools/rec.js': ['kenban'],
  'hissan.html': ['hissan', 'kake', 'speed'], 'ink.js': ['hissan', 'kake', 'speed'],
  'merge.js': ['sync'],
  'tools/solver.js': ['task'],
  'zukan.html': [],          // ずかん（キャラメイク）は テスト なし
  'tools/ink_cal.js': [],
};
const NONE = /\.(md|png|jpg|jpeg|gif|svg|txt)$/i;

function changedFiles(root, ref){
  const sh = c => execSync(c, { cwd: root, encoding: 'utf8' }).split('\n').map(s => s.trim()).filter(Boolean);
  const diff = ref ? sh('git diff --name-only ' + ref) : sh('git diff --name-only HEAD');
  return [...new Set(diff.concat(sh('git ls-files --others --exclude-standard')))];
}

// files：かえた ファイル（リポジトリ からの パス）。かえす：{ all, tests: ['waru', …], why: [[ファイル, わけ]] }
function pick(files, testsDir){
  const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
  const names = new Set(), why = [];
  let all = false;
  for(const f of files){
    const base = path.basename(f);
    if(ALL.includes(f)){ all = true; why.push([f, 'ほんたい → ぜんぶ']); continue; }
    if(RULES[f]){ RULES[f].forEach(n => names.add(n)); why.push([f, RULES[f].join('・') || 'なし']); continue; }
    if(/^lab-.*\.html$/.test(f)){ names.add('lab'); why.push([f, 'lab']); continue; }
    const m = /^tests\/(.+)\.test\.js$/.exec(f);
    if(m){ names.add(m[1]); why.push([f, m[1]]); continue; }
    if(NONE.test(f)){ why.push([f, 'なし']); continue; }
    // その ファイル名を つかって いる テスト
    const users = testFiles.filter(t => fs.readFileSync(path.join(testsDir, t), 'utf8').includes(base)).map(t => t.replace('.test.js', ''));
    if(users.length){ users.forEach(n => names.add(n)); why.push([f, users.join('・') + '（なかで つかって いる）']); continue; }
    all = true; why.push([f, 'わからない → ぜんぶ']);
  }
  const exist = testFiles.map(t => t.replace('.test.js', ''));
  return { all, tests: all ? exist : exist.filter(n => names.has(n)), why };
}

module.exports = { changedFiles, pick, RULES, ALL };
