// 웹 화면(../dist)을 창 하나에 띄운다. 계산·저장은 모두 화면(JS) 안에서 처리하고, 외부와 통신하지 않는다.
pub fn run() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("프로그램을 시작하지 못했습니다.");
}
