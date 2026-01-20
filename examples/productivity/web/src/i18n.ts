import { useUser } from "skybridge/web";

const translations = {
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

type Translations = typeof translations;
type SupportedLanguage = keyof Translations;
type TranslationKey = keyof Translations["en"];

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return lang in translations;
}

export function useIntl() {
  const { locale } = useUser();
  const lang = locale.split("-")[0];
  const messages = translations[isSupportedLanguage(lang) ? lang : "en"];

  return {
    t: (key: TranslationKey) => messages[key],
    locale,
  };
}
