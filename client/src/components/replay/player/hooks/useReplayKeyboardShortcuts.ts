import { useEffect } from "react";

interface UseReplayKeyboardShortcutsProps {
  enabled: boolean;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onPlayPause: () => void;
}

// Replay players can stack when the fullscreen drawer opens over the page
// player. Only the most recently mounted player should own document shortcuts.
const keyboardShortcutOwners: symbol[] = [];

export const useReplayKeyboardShortcuts = ({
  enabled,
  onSkipBack,
  onSkipForward,
  onPlayPause,
}: UseReplayKeyboardShortcutsProps) => {
  useEffect(() => {
    if (!enabled) return;

    const owner = Symbol("replay-keyboard-shortcuts");
    keyboardShortcutOwners.push(owner);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        keyboardShortcutOwners.at(-1) !== owner ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          onSkipBack();
          break;
        case "ArrowRight":
          event.preventDefault();
          onSkipForward();
          break;
        case " ":
          event.preventDefault();
          onPlayPause();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const ownerIndex = keyboardShortcutOwners.lastIndexOf(owner);
      if (ownerIndex !== -1) keyboardShortcutOwners.splice(ownerIndex, 1);
    };
  }, [enabled, onSkipBack, onSkipForward, onPlayPause]);
};
