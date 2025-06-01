"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";

interface ReplayPlayerProps {
  events: any[];
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayStateChange: (playing: boolean) => void;
}

export default function ReplayPlayer({
  events,
  isPlaying,
  onTimeUpdate,
  onPlayStateChange,
}: ReplayPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<rrwebPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize the replayer when events are available
  useEffect(() => {
    if (!events.length || !containerRef.current) {
      return;
    }

    try {
      setIsLoading(true);

      // Clear any existing replayer
      if (replayerRef.current) {
        // rrweb-player doesn't have explicit destroy methods
        // Just clear the container and reset the ref
        replayerRef.current = null;
      }

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      // Initialize new replayer
      const replayer = new rrwebPlayer({
        target: containerRef.current,
        props: {
          events,
          width: 1024,
          height: 768,
          autoPlay: false,
          speedOption: [0.5, 1, 2, 4, 8],
          showController: true,
          tags: {
            "user-select": "none",
          },
        },
      });

      replayerRef.current = replayer;

      // Set up event listeners
      replayer.addEventListener("start", () => {
        setIsLoading(false);
        onPlayStateChange(true);
      });

      replayer.addEventListener("pause", () => {
        onPlayStateChange(false);
      });

      replayer.addEventListener("finish", () => {
        onPlayStateChange(false);
      });

      replayer.addEventListener(
        "progress",
        (payload: { timeOffset: number }) => {
          onTimeUpdate(payload.timeOffset);
        }
      );

      setIsLoading(false);
    } catch (err) {
      console.error("Error initializing replayer:", err);
      setError("Failed to initialize replay player");
      setIsLoading(false);
    }
  }, [events, onTimeUpdate, onPlayStateChange]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!replayerRef.current) return;

    try {
      if (isPlaying) {
        replayerRef.current.play();
      } else {
        replayerRef.current.pause();
      }
    } catch (err) {
      console.error("Error controlling playback:", err);
    }
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (replayerRef.current && containerRef.current) {
        // rrweb-player is a Svelte component that manages its own lifecycle
        // Just clear the container and reset the ref
        containerRef.current.innerHTML = "";
        replayerRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading replay player: {error}</p>
            <p className="text-sm mt-2 text-gray-600">
              Please check your internet connection and try refreshing the page.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Initializing replay...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!events.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>No replay events available for this session</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full min-h-[600px] bg-gray-50 rounded-lg overflow-hidden"
        style={{
          // Ensure the replayer container has proper styling
          position: "relative",
        }}
      />

      {/* Custom overlay for additional controls if needed */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <p>
          Use the controls above to play, pause, and navigate through the
          session replay.
        </p>
        <p>
          You can adjust playback speed and seek to specific moments in the
          recording.
        </p>
      </div>
    </div>
  );
}
