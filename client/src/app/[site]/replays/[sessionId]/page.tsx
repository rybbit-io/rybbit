"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetReplaySession } from "../../../../api/analytics/replay";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  User,
  Globe,
  Clock,
  HardDrive,
  Calendar,
} from "lucide-react";
import { DateTime } from "luxon";
import { DisabledOverlay } from "../../../../components/DisabledOverlay";

// Import rrweb-player
import rrwebPlayer from "rrweb-player";

interface ReplayPlayerPageProps {
  params: {
    site: string;
    sessionId: string;
  };
}

export default function ReplayPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const sessionId = params.sessionId as string;
  const siteId = params.site as string;

  const { data, isLoading, error } = useGetReplaySession(sessionId);

  const formatDuration = (durationMs: number) => {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDateTime = (dateString: string) => {
    return DateTime.fromISO(dateString).toFormat("MMM dd, yyyy HH:mm:ss");
  };

  useEffect(() => {
    if (data && playerRef.current && !playerInstanceRef.current) {
      try {
        // Parse the event data from the API response
        const events = data.events
          .map((event) => {
            try {
              return {
                ...JSON.parse(event.event_data),
                timestamp: new Date(event.timestamp).getTime(),
              };
            } catch (e) {
              console.error("Failed to parse event data:", e);
              return null;
            }
          })
          .filter(Boolean);

        if (events.length === 0) {
          console.error("No valid events found");
          return;
        }

        // Initialize the rrweb player
        playerInstanceRef.current = new rrwebPlayer({
          target: playerRef.current,
          props: {
            events,
            width: 1024,
            height: 768,
            autoPlay: false,
            speedOption: [0.5, 1, 2, 4, 8],
            showController: true,
            tags: {
              "virtual-styles": "true",
            },
          },
        });

        setIsPlayerReady(true);
      } catch (error) {
        console.error("Failed to initialize rrweb player:", error);
      }
    }

    // Cleanup function
    return () => {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.$destroy();
          playerInstanceRef.current = null;
        } catch (e) {
          console.error("Error destroying player:", e);
        }
      }
    };
  }, [data]);

  if (isLoading) {
    return (
      <DisabledOverlay message="Session Replays">
        <div className="p-2 md:p-4 max-w-[1200px] mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading session replay...</p>
            </div>
          </div>
        </div>
      </DisabledOverlay>
    );
  }

  if (error) {
    return (
      <DisabledOverlay message="Session Replays">
        <div className="p-2 md:p-4 max-w-[1200px] mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-red-500">
              <p className="text-lg font-semibold mb-2">
                Error Loading Session
              </p>
              <p>{error.message}</p>
              <Button
                onClick={() => router.back()}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </DisabledOverlay>
    );
  }

  if (!data) {
    return (
      <DisabledOverlay message="Session Replays">
        <div className="p-2 md:p-4 max-w-[1200px] mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Session Not Found</p>
              <p>The requested session replay could not be found.</p>
              <Button
                onClick={() => router.back()}
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </DisabledOverlay>
    );
  }

  return (
    <DisabledOverlay message="Session Replays">
      <div className="p-2 md:p-4 max-w-[1200px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.back()} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Session Replay</h1>
              <p className="text-sm text-muted-foreground font-mono">
                {sessionId}
              </p>
            </div>
          </div>
        </div>

        {/* Session Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User ID</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono">{data.metadata.user_id}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {formatDuration(data.metadata.duration_ms)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {data.metadata.event_count}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">File Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {formatFileSize(data.metadata.compressed_size_bytes)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Page URL
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm break-all">
                    {data.metadata.page_url}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  User Agent
                </label>
                <div className="text-sm mt-1 break-all">
                  {data.metadata.user_agent}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Start Time
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDateTime(data.metadata.start_time)}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  End Time
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDateTime(data.metadata.end_time)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player */}
        <Card>
          <CardHeader>
            <CardTitle>Session Replay Player</CardTitle>
          </CardHeader>
          <CardContent>
            {data.events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No replay events found for this session.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {!isPlayerReady && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                      <p>Initializing player...</p>
                    </div>
                  </div>
                )}
                <div
                  ref={playerRef}
                  className="w-full border rounded-lg overflow-hidden bg-white"
                  style={{ minHeight: isPlayerReady ? "auto" : "400px" }}
                />
                {isPlayerReady && (
                  <div className="text-sm text-muted-foreground text-center">
                    Use the controls below the player to play, pause, and
                    navigate through the session.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DisabledOverlay>
  );
}
