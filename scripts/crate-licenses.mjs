// exe 빌드에 쓰이는 Rust 구성요소(crate)의 이름·버전·라이선스 목록을 src-tauri/THIRD-PARTY-CRATES.txt로 만든다.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const meta = JSON.parse(execFileSync('cargo', ['metadata', '--format-version', '1', '--filter-platform', 'x86_64-pc-windows-msvc',
  '--manifest-path', `${root}/src-tauri/Cargo.toml`], { maxBuffer: 64 * 1024 * 1024 }).toString());

const used = new Set(meta.resolve.nodes.map(node => node.id));
const rows = meta.packages
  .filter(pkg => used.has(pkg.id) && pkg.source)
  .map(pkg => `${pkg.name} ${pkg.version}\t${pkg.license ?? `(파일: ${pkg.license_file})`}\t${pkg.repository ?? ''}`)
  .sort();

writeFileSync(`${root}/src-tauri/THIRD-PARTY-CRATES.txt`,
  `FTC.exe 빌드에 쓰인 Rust 구성요소 (${rows.length}개, 빌드 전용 포함)\n이름 버전\t라이선스\t출처\n\n${rows.join('\n')}\n`);
console.log(`${rows.length}개 기록`);
