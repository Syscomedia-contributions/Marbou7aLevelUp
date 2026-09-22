// Trilingual (FR source in categories.ts, EN & AR here) translations
// keyed by question id and category key. Missing entries fall back to FR.

export type Lang = "fr" | "en" | "ar";

export interface CT {
  name: string;
  tagline: string;
  immersiveMessages: string[];
}

type LangMap<T> = Partial<Record<Exclude<Lang, "fr">, T>>;

export const CATEGORY_TR: Record<string, LangMap<CT>> = {
  science: {
    en: {
      name: "Science",
      tagline: "Futuristic lab — explore the universe",
      immersiveMessages: ["Scientific analysis in progress…", "Quantum database connected", "Augmented intelligence online"],
    },
    ar: {
      name: "علوم",
      tagline: "مختبر مستقبلي — استكشف الكون",
      immersiveMessages: ["جاري التحليل العلمي…", "قاعدة بيانات كمّية متصلة", "الذكاء المعزّز مفعّل"],
    },
  },
  sport: {
    en: {
      name: "Sports",
      tagline: "Intergalactic arena — enter the competition",
      immersiveMessages: ["Preparing the arena…", "Intergalactic competition launched", "Champion level detected"],
    },
    ar: {
      name: "رياضة",
      tagline: "حلبة كونية — ادخل المنافسة",
      immersiveMessages: ["تحضير الحلبة…", "بدأت المنافسة الكونية", "تم رصد مستوى بطل"],
    },
  },
  history: {
    en: {
      name: "History",
      tagline: "Ancient archives — a journey through time",
      immersiveMessages: ["Ancient archives opened", "Timeline restored", "Time travel initiated"],
    },
    ar: {
      name: "تاريخ",
      tagline: "أرشيف قديم — رحلة عبر الزمن",
      immersiveMessages: ["فُتحت الأرشيفات القديمة", "تم استعادة الخط الزمني", "بدأت الرحلة الزمنية"],
    },
  },
  archeo: {
    en: {
      name: "Archaeology",
      tagline: "Digs & discoveries — wake the archaeologist in you",
      immersiveMessages: ["Preparing the dig…", "Ancient artifacts detected", "Archaeological expedition launched"],
    },
    ar: {
      name: "علم الآثار",
      tagline: "حفريات واكتشافات — أيقظ عالم الآثار بداخلك",
      immersiveMessages: ["تحضير الحفريات…", "تم رصد قطع أثرية قديمة", "انطلقت البعثة الأثرية"],
    },
  },
  ent: {
    en: {
      name: "Entertainment",
      tagline: "Neon & futuristic cinema — cultural sync",
      immersiveMessages: ["Loading media archives…", "Entertainment sequence activated", "Cultural universe synchronized"],
    },
    ar: {
      name: "ترفيه",
      tagline: "نيون وسينما مستقبلية — تزامن ثقافي",
      immersiveMessages: ["جاري تحميل الأرشيف الإعلامي…", "تم تفعيل تسلسل الترفيه", "تمت مزامنة العالم الثقافي"],
    },
  },
  art: {
    en: {
      name: "Art",
      tagline: "Mystic gallery — cultural heritage detected",
      immersiveMessages: ["Gallery of civilizations opened", "Artistic analysis in progress", "Cultural heritage detected"],
    },
    ar: {
      name: "فن",
      tagline: "معرض غامض — تم رصد التراث الثقافي",
      immersiveMessages: ["فُتح معرض الحضارات", "جاري التحليل الفني", "تم رصد التراث الثقافي"],
    },
  },
};

export function pickCategory(key: string, lang: Lang) {
  if (lang === "fr") return null;
  return CATEGORY_TR[key]?.[lang] ?? null;
}
