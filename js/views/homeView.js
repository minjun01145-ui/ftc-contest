/** 사업을 고르기 전 첫 화면 */
export function renderHomePage(projects = []) {
  const hint = projects.length
    ? '왼쪽 내 사업에서 사업을 선택하세요.'
    : '왼쪽 내 사업의 + 버튼으로 사업을 추가하세요.';
  return `
    <h1>현장체험학습 비용 관리</h1>
    <p class="home-hint">${hint}</p>
    <div class="home-actions">
      <button type="button" data-action="load-sample">예시 사업 불러오기</button>
      <span class="help">가상의 학교·일정·금액으로 만든 예시입니다. 모든 메뉴를 바로 살펴볼 수 있습니다.</span>
    </div>`;
}
