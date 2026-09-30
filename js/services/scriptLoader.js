const loaded = new Map();

export function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(src, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loaded.delete(src);
        reject(new Error(`스크립트를 불러오지 못했습니다: ${src}`));
      };
      document.head.append(script);
    }));
  }
  return loaded.get(src);
}
