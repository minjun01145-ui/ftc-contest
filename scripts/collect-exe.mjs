// 빌드된 exe를 release/FTC.exe로 복사한다. 이 파일 하나만 있으면 설치 없이 실행된다.
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
mkdirSync(`${root}/release`, { recursive: true });
copyFileSync(`${root}/src-tauri/target/release/ftc.exe`, `${root}/release/FTC.exe`);
const mb = (statSync(`${root}/release/FTC.exe`).size / 1024 / 1024).toFixed(1);
console.log(`release/FTC.exe (${mb}MB)`);
