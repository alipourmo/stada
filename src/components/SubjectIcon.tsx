import {
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  Dna,
  FlaskConical,
  Globe,
  Languages,
  Laptop,
  Library,
  Microscope,
  Palette,
  Scale,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  book: BookOpen,
  dna: Dna,
  flask: FlaskConical,
  zap: Zap,
  calculator: Calculator,
  microscope: Microscope,
  globe: Globe,
  brain: Brain,
  laptop: Laptop,
  chart: BarChart3,
  palette: Palette,
  scale: Scale,
  languages: Languages,
  library: Library,
  // Legacy emoji fallbacks so existing DB records also render clean vector icons
  "\uD83D\uDCD8": BookOpen,
  "\uD83D\uDCD6": BookOpen,
  "\uD83E\uDDEC": Dna,
  "\uD83E\uDDEB": Dna,
  "\u2697\uFE0F": FlaskConical,
  "\u2697": FlaskConical,
  "\u26A1": Zap,
  "\uD83D\uDCD0": Calculator,
  "\uD83D\uDD2C": Microscope,
  "\uD83C\uDF0D": Globe,
  "\uD83E\uDDE0": Brain,
  "\uD83D\uDCBB": Laptop,
  "\uD83D\uDCCA": BarChart3,
  "\uD83C\uDFA8": Palette,
  "\u2696\uFE0F": Scale,
  "\u2696": Scale,
  "\uD83D\uDD4C": Languages,
  "\uD83C\uDF10": Languages,
  "\uD83D\uDCDA": Library,
};

export const SUBJECT_ICON_LABELS: Record<string, string> = {
  book: "کتاب",
  dna: "زیست",
  flask: "شیمی",
  zap: "فیزیک",
  calculator: "ریاضی",
  microscope: "سلولی",
  globe: "زمین و تاریخ",
  brain: "روان‌شناسی",
  laptop: "کامپیوتر و اقتصاد",
  chart: "آمار و هندسه",
  palette: "هنر",
  scale: "فلسفه و منطق",
  languages: "زبان و عربی",
  library: "عمومی",
};

export default function SubjectIcon({
  icon,
  className = "h-4 w-4 shrink-0",
}: {
  icon?: string | null;
  className?: string;
}) {
  const Comp = (icon && ICON_MAP[icon.trim()]) || BookOpen;
  return <Comp className={className} />;
}
