// 앱에 넣을 화면 파일만 dist/로 모은다(Tauri가 dist/를 exe 안에 넣는다).
import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = `${root}/dist`;
const entries = ['index.html', 'styles.css', 'js', 'vendor', 'templates'];

rmSync(dist, { recursive: true, force: true });
for (const entry of entries) cpSync(`${root}/${entry}`, `${dist}/${entry}`, { recursive: true });
console.log(`dist/ 준비 완료: ${entries.join(', ')}`);
