#!/usr/bin/env node
/**
 * apply-sql.cjs
 * Supabase 대시보드의 SQL Editor를 브라우저 자동화로 직접 조작해 SQL을 실행한다.
 * 이 프로젝트(YA-YourArround-) 전용 - 사람이 로그인해둔 브라우저 프로필을 디스크에
 * 남겨두고 재사용하므로, 최초 1회만 사람이 로그인하면 이후로는 그대로 재사용된다.
 *
 * CommonJS(.cjs)로 작성한 이유: require()는 NODE_PATH 환경변수를 그대로 존중하지만
 * ESM import는 NODE_PATH를 무시한다 - playwright가 프로젝트 로컬이 아니라 전역/별도
 * 경로에 설치돼 있는 이 스킬의 사용 방식과 맞지 않아 .cjs로 고정했다.
 *
 * 사용법:
 *   NODE_PATH=$(npm root -g) node apply-sql.cjs --sql-file supabase/alter_cntc_visib.sql
 *   NODE_PATH=$(npm root -g) node apply-sql.cjs --sql-file supabase/alter_cntc_visib.sql --project-ref abcdefghij
 *
 * 종료 코드:
 *   0  = SQL 실행까지 마치고 스크린샷으로 결과를 남김 (성공/실패 여부는 스크린샷을 직접 봐야 확정)
 *   2  = supabase.com에 네트워크로 접근 불가 (이 세션의 네트워크 정책 문제 - 자동화 불가, 수동 안내로 폴백해야 함)
 *   3  = 로그인이 필요한데 사람이 직접 로그인할 화면이 없음(headless-only 환경) - 폴백 필요
 *   1  = 그 외 실패
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function parse_args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}

function proj_ref_from_env() {
  const env_path = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(env_path)) return null;
  const txt = fs.readFileSync(env_path, "utf8");
  const m = txt.match(/NEXT_PUBLIC_SUPABASE_URL=https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

async function main() {
  const args = parse_args(process.argv.slice(2));
  if (!args["sql-file"] && !args["sql-text"]) {
    console.error("사용법: node apply-sql.mjs --sql-file <path> [--project-ref <ref>]");
    process.exit(1);
  }

  const sql_text = args["sql-text"] ?? fs.readFileSync(args["sql-file"], "utf8");
  const proj_ref = args["project-ref"] ?? proj_ref_from_env();
  if (!proj_ref) {
    console.error("Supabase project ref를 못 찾았어요. .env.local의 NEXT_PUBLIC_SUPABASE_URL을 확인하거나 --project-ref로 넘겨주세요.");
    process.exit(1);
  }

  const profile_dir =
    args["profile-dir"] ?? path.join(os.homedir(), ".cache", "claude-skills", "jubyeon-supabase", "chrome-profile");
  fs.mkdirSync(profile_dir, { recursive: true });

  const shot_dir = args["shot-dir"] ?? path.join(os.tmpdir(), "jubyeon-supabase-shots");
  fs.mkdirSync(shot_dir, { recursive: true });

  console.log(`[apply-sql] project ref: ${proj_ref}`);
  console.log(`[apply-sql] chrome profile: ${profile_dir}`);

  // 1) 네트워크 사전 점검 - 이 세션이 supabase.com에 못 나가면(egress 정책 등) 여기서 바로 포기한다.
  //    (자동화 대신 사람에게 SQL 파일을 직접 실행해달라고 안내하는 경로로 넘어가야 함)
  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(profile_dir, { headless: true });
    const probe = await ctx.newPage();
    await probe.goto("https://supabase.com", { timeout: 10000, waitUntil: "domcontentloaded" });
    await probe.close();
  } catch (err) {
    console.error("[apply-sql] RESULT:NETWORK_BLOCKED");
    console.error(`[apply-sql] supabase.com에 접근할 수 없어요: ${err.message}`);
    console.error("[apply-sql] 이 세션의 네트워크 정책이 막고 있을 수 있어요. 사람에게 SQL 파일을 직접 실행해달라고 안내해야 합니다.");
    if (ctx) await ctx.close().catch(() => {});
    process.exit(2);
  }
  await ctx.close();

  // 2) 실제 작업 - headless: false로 먼저 시도(로컬 데스크톱이면 실제 창이 뜬다). 화면이 없는
  //    환경(진짜 헤드리스 서버)이면 여기서 예외가 나므로 headless: true로 재시도한다.
  let headed = true;
  let context;
  try {
    context = await chromium.launchPersistentContext(profile_dir, { headless: false });
  } catch {
    headed = false;
    context = await chromium.launchPersistentContext(profile_dir, { headless: true });
  }
  console.log(`[apply-sql] mode: ${headed ? "headed(화면 있음)" : "headless(화면 없음)"}`);

  const page = context.pages()[0] ?? (await context.newPage());
  const sql_url = `https://supabase.com/dashboard/project/${proj_ref}/sql/new`;
  await page.goto(sql_url, { waitUntil: "domcontentloaded" });

  // 3) 로그인 여부 확인 - 로그인 페이지로 리다이렉트됐는지 URL/폼으로 판단한다.
  async function looks_signed_out() {
    const url = page.url();
    if (/\/sign-in|\/login/i.test(url)) return true;
    const email_input = await page.locator('input[type="email"], input[name="email"]').count();
    return email_input > 0 && !/\/sql\//.test(url);
  }

  if (await looks_signed_out()) {
    if (!headed) {
      const shot = path.join(shot_dir, "login-needed.png");
      await page.screenshot({ path: shot }).catch(() => {});
      console.error("[apply-sql] RESULT:LOGIN_NEEDED_HEADLESS");
      console.error(`[apply-sql] 로그인이 필요한데 화면이 없는 세션이에요. 스크린샷: ${shot}`);
      console.error("[apply-sql] 화면이 있는(로컬) 환경에서 이 스크립트를 한 번 실행해 로그인을 완료해두면, 이후 같은 프로필로 재사용됩니다.");
      await context.close();
      process.exit(3);
    }
    console.log("[apply-sql] 로그인이 필요해요. 방금 뜬 Chrome 창에서 Supabase에 로그인해주세요 (최대 5분 대기).");
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(2000);
      if (!(await looks_signed_out())) break;
    }
    if (await looks_signed_out()) {
      console.error("[apply-sql] 5분 안에 로그인이 확인되지 않았어요. 다시 시도해주세요.");
      await context.close();
      process.exit(3);
    }
    console.log("[apply-sql] 로그인 확인됨. 이 프로필은 다음 실행부터 재사용됩니다.");
    if (!/\/sql\//.test(page.url())) {
      await page.goto(sql_url, { waitUntil: "domcontentloaded" });
    }
  }

  // 4) SQL 에디터(Monaco)에 SQL 붙여넣기
  await page.waitForSelector(".monaco-editor", { timeout: 30000 });
  await page.click(".monaco-editor");
  const select_all_key = process.platform === "darwin" ? "Meta+A" : "Control+A";
  await page.keyboard.press(select_all_key);
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(sql_text);

  // 5) 실행 (Ctrl+Enter / Cmd+Enter 둘 다 시도 - Supabase 단축키가 OS마다 다르게 보여도
  //    브라우저에 보내는 키 이벤트 자체는 우리가 직접 고르는 것이므로 둘 다 눌러본다)
  await page.keyboard.press("Control+Enter").catch(() => {});
  await page.waitForTimeout(500);
  await page.keyboard.press("Meta+Enter").catch(() => {});

  await page.waitForTimeout(2500);

  const shot_path = path.join(shot_dir, `${args.label ?? "result"}-${Date.now()}.png`);
  await page.screenshot({ path: shot_path, fullPage: false });
  console.log(`[apply-sql] RESULT:DONE`);
  console.log(`[apply-sql] 실행 후 스크린샷: ${shot_path}`);
  console.log("[apply-sql] 이 스크린샷을 직접 눈으로 확인해서 성공/에러 여부를 판단할 것 (자동 판정만 믿지 말 것)");

  await context.close();
}

main().catch((err) => {
  console.error("[apply-sql] 실패:", err);
  process.exit(1);
});
