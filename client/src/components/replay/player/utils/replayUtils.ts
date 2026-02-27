export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const calculateActivityPeriods = (events: any[], totalDuration: number): { start: number; end: number }[] => {
  if (!events || events.length === 0) return [];

  // Filter for user interaction events (mouse moves, clicks, etc.)
  const interactionEvents = events.filter(event => {
    const eventType = parseInt(event.type.toString());
    // Type 3 = IncrementalSnapshot (includes mouse moves, clicks, etc.)
    return eventType === 3;
  });

  const periods: { start: number; end: number }[] = [];
  const inactivityThreshold = 5000; // 5 seconds of no interaction = inactive
  const firstEventTime = events[0].timestamp;

  for (let i = 0; i < interactionEvents.length; i++) {
    const currentEvent = interactionEvents[i];
    const nextEvent = interactionEvents[i + 1];

    const currentTime = currentEvent.timestamp - firstEventTime;
    const nextTime = nextEvent ? nextEvent.timestamp - firstEventTime : totalDuration;

    if (nextTime - currentTime <= inactivityThreshold) {
      periods.push({
        start: currentTime,
        end: nextTime,
      });
    }
  }

  return periods;
};

export const PLAYBACK_SPEEDS = [
  { value: "0.25", label: "0.25x" },
  { value: "0.5", label: "0.5x" },
  { value: "1", label: "1x" },
  { value: "2", label: "2x" },
  { value: "4", label: "4x" },
];

export const CONTROLS_HEIGHT = 101;
export const SKIP_SECONDS = 10000; // 10 seconds in milliseconds
export const OVERLAY_TIMEOUT = 800; // milliseconds
