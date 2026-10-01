import { Filter } from "@rybbit/shared";

// Response shapes of the user profile's own endpoints (/sites/:site/users/:userId/…).

/** The stat band for one window. A window with no sessions is all zeros. */
export interface UserSummary {
  sessions: number;
  pageviews: number;
  events: number;
  /** Average session length in seconds. */
  duration: number;
  /** Days, in the dashboard's timezone, on which the user started a session. */
  active_days: number;
}

export interface UserGoal {
  goalId: number;
  name: string | null;
  goalType: string;
  /** Sessions in the window in which this user completed the goal. */
  sessions: number;
  /** Latest completion in the window, UTC SQL datetime. Null when there is none. */
  last_completed: string | null;
}

export interface UserSessionGoals {
  session_id: string;
  goal_ids: number[];
}

export interface UserSegmentMatch {
  segmentId: number;
  name: string;
  /** The segment's own filters, for linking to the sessions it selects. */
  filters: Filter[];
  /** Sessions of this user, in the window, that the segment's filters select. */
  sessions: number;
}

export interface UserSegments {
  segments: UserSegmentMatch[];
  /** This user's sessions in the window: what each count is out of. */
  total_sessions: number;
  /** The site has more segments than one request evaluates. */
  truncated: boolean;
}

/** The latest session in the window in which one error message was thrown twice or more. */
export interface UserRepeatedError {
  message: string;
  session_id: string;
  occurrences: number;
  /** Page the first of them was thrown on. */
  pathname: string;
  first_seen: string;
  last_seen: string;
  has_replay: boolean;
}
