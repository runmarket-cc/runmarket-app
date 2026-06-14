import { create } from 'zustand';

// 가운데 '달리기' FAB을 눌렀을 때 위로 떠오르는 러너/관전 메뉴의 열림 상태.
// 탭바(클리핑 영역) 밖에서 그려야 해서 루트 레이아웃의 오버레이가 이 상태를 구독한다.
interface RunMenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useRunMenu = create<RunMenuState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
