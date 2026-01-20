import { useState } from "react";
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

export const supportedLanguages = Object.keys(translations);

type Lang = keyof typeof translations;

function getLang(code: string): Lang {
  return code in translations ? (code as Lang) : "en";
}

export function useIntl() {
  const { locale } = useUser();
  const [lang, setLang] = useState(() => getLang(locale.split("-")[0]));

  return {
    t: (key: keyof (typeof translations)["en"]) => translations[lang][key],
    locale: lang,
    setLocale: (code: string) => setLang(getLang(code)),
  };
}
