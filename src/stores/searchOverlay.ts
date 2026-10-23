import { create } from "zustand";

type SearchOverlayStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

// Whether SearchOverlay is showing. It's rendered once, in (app)/_layout.tsx, but
// opened from the search icon in AppHeader -- which every screen renders on its
// own -- so the flag lives here instead of in either component's state.
export const useSearchOverlay = create<SearchOverlayStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
