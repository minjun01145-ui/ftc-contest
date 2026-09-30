// exe(Tauri) 창에서는 <a download>가 동작하지 않아 저장 대화상자를 띄우는 save_file 명령을 쓴다.
// 저장했으면 true, 사용자가 취소하면 false.
export async function saveBlob(blob, filename) {
  const tauri = globalThis.__TAURI_INTERNALS__;
  if (tauri) {
    const data = Array.from(new Uint8Array(await blob.arrayBuffer()));
    return tauri.invoke('save_file', { filename, data });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
