# JSZip 번들에 포함된 구성요소 고지

`../jszip.min.js`의 번들 모듈에서 pako, lie, immediate, setImmediate 코드를 확인하여 아래 고지를 함께 제공합니다. 라이선스 파일은 공식 저장소의 원문을 보관했으며, `pako-zlib.txt`는 공식 소스 파일의 저작권·재배포 고지 주석을 그대로 발췌했습니다. 라이브러리 실행 코드는 변경하지 않았습니다.

| 구성요소 | 보관한 고지 | 공식 출처 |
|---|---|---|
| pako | [MIT 원문](pako-MIT.txt) | [nodeca/pako, 1.0.11의 LICENSE](https://github.com/nodeca/pako/blob/1.0.11/LICENSE) |
| pako의 zlib 유래 코드 | [zlib 고지](pako-zlib.txt) | [nodeca/pako, 1.0.11의 lib/zlib/deflate.js](https://github.com/nodeca/pako/blob/1.0.11/lib/zlib/deflate.js) |
| lie | [MIT 원문](lie-MIT.md) | [calvinmetcalf/lie, v3.3.0의 license.md](https://github.com/calvinmetcalf/lie/blob/v3.3.0/license.md) |
| immediate | [MIT 원문](immediate-MIT.txt) | [calvinmetcalf/immediate, v3.0.6의 LICENSE.txt](https://github.com/calvinmetcalf/immediate/blob/v3.0.6/LICENSE.txt) |
| setImmediate | [MIT 원문](setImmediate-MIT.txt) | [YuzuJS/setImmediate, 1.0.5의 LICENSE.txt](https://github.com/YuzuJS/setImmediate/blob/1.0.5/LICENSE.txt) |

출처 표의 버전은 고지를 가져온 공식 참조입니다. 현재 압축 번들에 각 구성요소의 정확한 버전이 모두 기록되어 있지는 않으므로, 개별 버전이 확정된 목록으로 사용하지 않습니다. JSZip 배포본을 교체할 때 해당 번들에 포함된 구성요소와 고지를 다시 대조합니다.

JSZip 자체의 선택 라이선스 원문은 [../LICENSE.markdown](../LICENSE.markdown)에 있습니다. 이 프로젝트에서는 MIT를 사용합니다.
