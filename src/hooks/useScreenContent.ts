import { useEffect, useState } from 'react';

/**
 * 백엔드에서 화면 문구를 불러온다. 로드 전/실패 시 fallback 문구를 사용해
 * 화면이 비지 않도록 한다.
 *
 * @param fetcher  문구를 불러오는 API 함수
 * @param fallback 로드 전/실패 시 사용할 기본 문구
 */
export function useScreenContent<T>(
  fetcher: () => Promise<T>,
  fallback: T
): T {
  const [content, setContent] = useState<T>(fallback);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => {
        if (active) setContent(data);
      })
      .catch(() => {
        // 네트워크/서버 오류 시 fallback 문구를 그대로 사용한다.
      });
    return () => {
      active = false;
    };
  }, [fetcher]);

  return content;
}
