import { create } from "zustand";

export type DialogButton = {
  label: string;
  // cancel: outlined; default: teal; destructive: coral -- the app's button colors.
  kind: "cancel" | "default" | "destructive";
  value: boolean;
};

export type Dialog = {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  resolve: (value: boolean) => void;
};

type DialogStore = {
  queue: Dialog[];
  open: (dialog: Omit<Dialog, "id" | "resolve">) => Promise<boolean>;
  close: (id: number, value: boolean) => void;
};

let nextId = 1;

// The app's own alert and confirm dialogs (DialogHost draws them; lib/alert.ts is the
// way in). Queued: a second one waits for the first to close.
export const useDialogs = create<DialogStore>((set, get) => ({
  queue: [],
  open: (dialog) =>
    new Promise<boolean>((resolve) => {
      set((state) => ({ queue: [...state.queue, { ...dialog, id: nextId++, resolve }] }));
    }),
  close: (id, value) => {
    const dialog = get().queue.find((d) => d.id === id);
    if (!dialog) return;
    set((state) => ({ queue: state.queue.filter((d) => d.id !== id) }));
    dialog.resolve(value);
  },
}));
