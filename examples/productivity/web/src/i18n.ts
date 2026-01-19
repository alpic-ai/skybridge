type TranslationKey =
  | "weeklyProductivity"
  | "thisWeek"
  | "lastWeek"
  | "weeksAgo"
  | "loading"
  | "meetings"
  | "work"
  | "learning";

const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    weeklyProductivity: "weekly productivity",
    thisWeek: "This week",
    lastWeek: "Last week",
    weeksAgo: "weeks ago",
    loading: "Loading...",
    meetings: "meetings",
    work: "work",
    learning: "learning",
  },
  fr: {
    weeklyProductivity: "productivité hebdomadaire",
    thisWeek: "Cette semaine",
    lastWeek: "Semaine dernière",
    weeksAgo: "semaines",
    loading: "Chargement...",
    meetings: "réunions",
    work: "travail",
    learning: "formation",
  },
  es: {
    weeklyProductivity: "productividad semanal",
    thisWeek: "Esta semana",
    lastWeek: "Semana pasada",
    weeksAgo: "semanas",
    loading: "Cargando...",
    meetings: "reuniones",
    work: "trabajo",
    learning: "formación",
  },
  zh: {
    weeklyProductivity: "每周生产力",
    thisWeek: "本周",
    lastWeek: "上周",
    weeksAgo: "周前",
    loading: "加载中...",
    meetings: "会议",
    work: "工作",
    learning: "学习",
  },
};

export function translate(locale: string, key: TranslationKey): string {
  const lang = locale.split("-")[0];
  const t = translations[lang] || translations.en;
  return t[key];
}
