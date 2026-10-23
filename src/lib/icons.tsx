import {
  BarChart3,
  BookOpen,
  Brain,
  Briefcase,
  Calculator,
  Code2,
  Coffee,
  Database,
  Dumbbell,
  FlaskConical,
  Flame,
  Globe,
  GraduationCap,
  Layers,
  Lightbulb,
  MessageSquare,
  Music,
  NotebookPen,
  Palette,
  PenLine,
  Puzzle,
  Rocket,
  Server,
  Sprout,
  Target,
  Terminal,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ColorKey } from "./types";
import { solid, tint } from "./colors";

export const ICONS: Record<string, LucideIcon> = {
  code: Code2,
  brain: Brain,
  book: BookOpen,
  target: Target,
  rocket: Rocket,
  pen: PenLine,
  palette: Palette,
  flask: FlaskConical,
  calculator: Calculator,
  dumbbell: Dumbbell,
  music: Music,
  sprout: Sprout,
  flame: Flame,
  zap: Zap,
  puzzle: Puzzle,
  notebook: NotebookPen,
  graduation: GraduationCap,
  lightbulb: Lightbulb,
  wrench: Wrench,
  chart: BarChart3,
  message: MessageSquare,
  briefcase: Briefcase,
  globe: Globe,
  terminal: Terminal,
  database: Database,
  server: Server,
  layers: Layers,
  coffee: Coffee,
};

export const ICON_KEYS = Object.keys(ICONS);

/** Map from the emoji set used by v1 data */
export const EMOJI_TO_ICON: Record<string, string> = {
  "🧠": "brain", "💻": "code", "📚": "book", "🎯": "target", "🚀": "rocket",
  "✍️": "pen", "🎨": "palette", "🧪": "flask", "📐": "calculator", "🏋️": "dumbbell",
  "🎧": "music", "🌱": "sprout", "🔥": "flame", "⚡": "zap", "🧩": "puzzle",
  "📝": "notebook", "🎓": "graduation", "💡": "lightbulb", "🛠️": "wrench", "📊": "chart",
  "🗣️": "message", "🎸": "music", "🧘": "sprout", "☕": "coffee",
};

const SIZES = {
  xs: { box: "h-6 w-6 rounded-md", icon: 13 },
  sm: { box: "h-8 w-8 rounded-lg", icon: 16 },
  md: { box: "h-10 w-10 rounded-xl", icon: 19 },
  lg: { box: "h-12 w-12 rounded-xl", icon: 22 },
};

/** Rounded tinted tile with a colored icon */
export function CategoryIcon({
  icon,
  color,
  size = "md",
  className = "",
}: {
  icon: string;
  color: ColorKey;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Layers;
  const s = SIZES[size];
  return (
    <span
      className={`grid shrink-0 place-items-center ${s.box} ${className}`}
      style={{ background: tint(color, 14), color: solid(color) }}
    >
      <Icon size={s.icon} strokeWidth={2.2} />
    </span>
  );
}
