# 외부 라이브러리

일정 문서를 **브라우저 안에서만** 읽기 위해 아래 오픈소스를 저장소에 함께 둡니다.
문서 내용은 외부 서버로 보내지 않습니다.

| 폴더 | 이름 | 버전 | 용도 | 라이선스 |
|---|---|---|---|---|
| `pdfjs/` | PDF.js (`pdfjs-dist`) | 6.3.289 | PDF에서 글자와 위치를 읽어 일정 표를 복원 | [Apache License 2.0](pdfjs/LICENSE) |
| `pdfjs/cmaps/` | PDF.js CMap | 6.3.289 배포본에 포함 | 한글 등 CID 글꼴 PDF의 글자 변환 | [Adobe의 BSD 3-Clause 형식 재배포 조건](pdfjs/cmaps/LICENSE) |
| `jszip/` | JSZip | 3.10.2 | HWPX(압축 XML) 문서 열기·생성 | [MIT 또는 GPL 중 선택, 이 프로젝트에서는 MIT 사용](jszip/LICENSE.markdown) |
| `jszip/jszip.min.js` 내부 | pako | JSZip 번들에 포함 | ZIP 압축·해제 | [MIT](jszip/licenses/pako-MIT.txt), zlib 유래 코드의 [zlib 고지](jszip/licenses/pako-zlib.txt) |
| `jszip/jszip.min.js` 내부 | lie | JSZip 번들에 포함 | Promise 호환 기능 | [MIT](jszip/licenses/lie-MIT.md) |
| `jszip/jszip.min.js` 내부 | immediate | JSZip 번들에 포함 | 비동기 작업 예약 | [MIT](jszip/licenses/immediate-MIT.txt) |
| `jszip/jszip.min.js` 내부 | setImmediate (`setimmediate`) | JSZip 번들에 포함 | 비동기 작업 예약 호환 기능 | [MIT](jszip/licenses/setImmediate-MIT.txt) |

## 배포할 때 포함할 고지

소스 ZIP과 설치파일에 이 안내 및 위 표에 연결된 라이선스·저작권 고지 파일을 함께 포함합니다. 라이브러리 파일에 들어 있는 기존 고지도 유지합니다.

CMap은 PDF.js 본체와 별도의 조건을 사용합니다. 소스 배포에는 Adobe의 저작권·조건·면책 고지를 유지하고, 바이너리 배포에는 이를 배포 문서 등에 함께 제공합니다. Adobe 및 기여자의 이름을 사전 허락 없이 제품 보증·홍보에 사용하지 않습니다. 정확한 조건은 [CMap 라이선스 원문](pdfjs/cmaps/LICENSE)을 따릅니다.

JSZip은 MIT와 GPL 중 MIT를 선택하여 사용합니다. JSZip 및 번들에 포함된 MIT 구성요소의 저작권·허가 고지를 함께 제공합니다. pako의 zlib 유래 코드에 대한 출처·변경·고지 조건도 유지합니다. 추가한 고지의 공식 출처는 [JSZip 포함 구성요소 고지](jszip/licenses/README.md)에 정리했습니다.

대회 프로그램 설명서의 외부 라이브러리 항목에는 위 표의 명칭·용도·라이선스를 기재합니다. 링크된 고지 파일은 이 프로젝트에 실제로 포함되어 있으므로 프로그램 실행 중 인터넷에 접속하여 받아 올 필요가 없습니다.

갱신할 때는 npm 패키지 `pdfjs-dist`(`build/pdf.min.mjs`, `build/pdf.worker.min.mjs`, `cmaps/`)와 `jszip`(`dist/jszip.min.js`)의 같은 버전 파일을 그대로 복사하고, 해당 배포본과 포함 구성요소의 라이선스 고지도 함께 갱신합니다.
