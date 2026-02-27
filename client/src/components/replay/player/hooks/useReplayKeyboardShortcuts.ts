import { useEffect } from "react";

interface UseReplayKeyboardShortcutsProps {
  player: any;
  onSkipBack: () => void;
  onSkipForward: () => void;
  onPlayPause: () => void;
}

export const useReplayKeyboardShortcuts = ({
  player,
  onSkipBack,
  onSkipForward,
  onPlayPause,
}: UseReplayKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle hotkeys when the player exists and focus is not on an input/textarea
      if (!player || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
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
    };
  }, [player, onSkipBack, onSkipForward, onPlayPause]);
};
