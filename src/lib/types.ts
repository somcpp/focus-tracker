export type ColorKey =
  | "blue"
  | "orange"
  | "green"
  | "yellow"
  | "purple"
  | "pink"
  | "red"
  | "teal";

export type Difficulty = "easy" | "medium" | "hard";

export interface Category {
  id: string;
  name: string;
  /** key into ICONS */
  icon: string;
  color: ColorKey;
  archived: boolean;
  createdAt: number;
}

export interface Task {
  id: string;
  categoryId: string;
  /** Day this task belongs to, YYYY-MM-DD in local time */
  date: string;
  title: string;
  notes: string;
  done: boolean;
  difficulty: Difficulty | null;
  createdAt: number;
  /** Set on the original when it was carried over to a later day */
  carriedTo: string | null;
}

export interface Session {
  id: string;
  taskId: string;
  start: number;
  /** null while the timer is running */
  end: number | null;
}

export interface PlanItem {
  id: string;
  text: string;
  done: boolean;
  /** Set once the item was turned into a task on the next day */
  taskId: string | null;
}

export interface Journal {
  date: string;
  mood: number | null; // 1-5
  wins: string;
  challenges: string;
  learnings: string;
  /** Free-form writing (v2 "reflection" migrates here) */
  notes: string;
  /** Plan for the following day */
  plan: PlanItem[];
}

export interface Settings {
  name: string;
  dailyGoalMinutes: number;
  streakMinMinutes: number;
  idleLimitMinutes: number;
  theme: "light" | "dark";
  pomodoro: {
    enabled: boolean;
    focusMinutes: number;
    breakMinutes: number;
  };
  /** Timestamp of the last JSON export */
  lastBackupAt: number | null;
  /** Day key on which the "Start your day" card was dismissed */
  startDayDismissedOn: string | null;
}

export interface PersistedState {
  categories: Category[];
  tasks: Task[];
  sessions: Session[];
  journals: Record<string, Journal>;
  /** Categories explicitly added to a day (even when empty) */
  dayCategories: Record<string, string[]>;
  settings: Settings;
}
