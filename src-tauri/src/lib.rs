// 웹 화면(../dist)을 창 하나에 띄운다. 계산·저장은 모두 화면(JS) 안에서 처리하고, 외부와 통신하지 않는다.
use tauri_plugin_dialog::DialogExt;

// 창 안에서는 <a download>로 파일이 내려받아지지 않아서, 저장 위치를 물어 직접 쓴다.
// 취소하면 false.
#[tauri::command]
async fn save_file(app: tauri::AppHandle, filename: String, data: Vec<u8>) -> Result<bool, String> {
  let mut dialog = app.dialog().file().set_file_name(&filename);
  if let Some((_, ext)) = filename.rsplit_once('.') {
    dialog = dialog.add_filter(ext.to_uppercase(), &[ext]);
  }
  let Some(path) = dialog.blocking_save_file() else {
    return Ok(false);
  };
  let path = path.into_path().map_err(|error| error.to_string())?;
  std::fs::write(&path, data).map_err(|error| format!("{}에 저장하지 못했습니다: {error}", path.display()))?;
  Ok(true)
}

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![save_file])
    .run(tauri::generate_context!())
    .expect("프로그램을 시작하지 못했습니다.");
}
