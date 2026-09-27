export type Lang = "fa" | "en";

export const dict = {
  fa: {
    dir: "rtl",
    brand: "پارک هوشمند",
    brandSub: "سامانه پارک حاشیه‌ای شهر",
    nav: { map: "نقشه زنده", zones: "محدوده‌ها", pricing: "قیمت‌گذاری پویا", dashboard: "پیش‌خوان شهر", api: "داده باز" },
    cta: { start: "پیدا کردن جای پارک", dashboard: "پیش‌خوان شهر", continue: "تایید", back: "بازگشت", see: "نمایش جزئیات", close: "بستن" },
    hero: {
      badge: "داده لحظه‌ای از ۸٬۷۰۰ حسگر",
      title1: "جای پارک را",
      title2: "پیدا کنید",
      title3: "نه اینکه دنبالش بگردید.",
      lead: "با الگوی SFpark، جای خالی هر بلوک را لحظه‌ای می‌بینید و قیمت بر پایه تقاضای واقعی تنظیم می‌شود تا همیشه یکی دو جای خالی بماند.",
      s1: "جای خالی همین حالا", s2: "میانگین اشغال", s3: "زمان صرفه‌جویی‌شده", s4: "تندرستی حسگرها",
      minute: "دقیقه",
    },
    map: {
      title: "نقشه زنده پارک",
      lead: "هر نقطه یک محدوده پارک است؛ رنگ آن، اشغال لحظه‌ای را نشان می‌دهد. برای دیدن جزئیات، روی آن بزنید.",
      legend: { open: "خالی", moderate: "نیمه‌پر", busy: "پرتقاضا", full: "پر" },
      live: "به‌روزرسانی زنده",
      offline: "اتصال زنده قطع است",
    },
    zones: {
      title: "محدوده‌های پارک",
      lead: "جست‌وجو کنید، مرتب کنید و بهترین گزینه را انتخاب کنید.",
      search: "جست‌وجو در محدوده‌ها…",
      sort: { occupancy: "کمترین اشغال", rate: "کمترین مبلغ", free: "بیشترین جای خالی", name: "نام" },
      kind: { all: "همه", street: "حاشیه‌ای", garage: "پارکینگ" },
      onlyAvailable: "فقط جای خالی",
      empty: "چیزی پیدا نشد. واژه دیگری را امتحان کنید.",
      free: "جای خالی", capacity: "ظرفیت", rate: "نرخ ساعتی", occupancy: "اشغال",
    },
    panel: {
      rateNow: "نرخ همین حالا", perHour: "تومان / ساعت", base: "نرخ پایه",
      history: "تاریخچه ۲۴ ساعت", forecast: "پیش‌بینی ۸ ساعت آینده", changes: "تغییرهای اخیر نرخ",
      sensors: "حسگرها", revenue: "درآمد امروز", district: "منطقه",
      start: "شروع توقف", plate: "شماره پلاک", duration: "مدت توقف", amount: "مبلغ",
      pay: "پرداخت از کیف پول", success: "توقف شما ثبت شد", full: "این محدوده پر است",
      noMoney: "موجودی کیف پول کافی نیست",
      eventNow: "قیمت‌گذاری رویداد فعال است",
    },
    pricing: {
      title: "قیمت‌گذاری وابسته به تقاضا",
      lead: "نرخ‌ها آهسته و پله‌ای تغییر می‌کنند؛ هدف نگه‌داشتن اشغال میان ۷۰ تا ۸۵ درصد است تا همیشه جای خالی پیدا شود.",
      up: "اشغال بالای ۸۵٪ → نرخ یک پله بالا",
      hold: "اشغال میان ۷۰ تا ۸۵٪ → نرخ بدون تغییر",
      down: "اشغال زیر ۷۰٪ → نرخ یک پله پایین",
      step: "بیشترین تغییر هر بار", target: "بازه هدف اشغال", event: "قیمت‌گذاری رویدادها",
      eventLead: "در روزهای رویداد، نرخ محدوده‌های نزدیک به‌صورت خودکار تنظیم می‌شود.",
      soon: "دقیقه دیگر", running: "در حال اجرا",
    },
    dash: {
      title: "پیش‌خوان شهر",
      lead: "نمای عملیاتی برای شهرداری: اشغال، درآمد، تندرستی حسگرها و اثر سیاست قیمت.",
      kpi: { capacity: "ظرفیت کل", occupied: "اشغال‌شده", revenue: "درآمد امروز", rate: "میانگین نرخ", co2: "کاهش آلایندگی", health: "تندرستی حسگرها" },
      curve: "میانگین اشغال در شبانه‌روز", top: "پرتقاضاترین محدوده‌ها", feed: "رویدادهای زنده", events: "رویدادهای شهر",
      million: "میلیون تومان", kg: "کیلوگرم",
    },
    api: {
      title: "داده باز و API عمومی",
      lead: "همان مسیری که SFpark رفت: داده باز، مستند و رایگان برای توسعه‌دهندگان شهر.",
      try: "امتحان کنید",
    },
    footer: { made: "ساخته‌شده بر پایه الگوی SFpark برای شهرهای ایران", rights: "همه حقوق محفوظ است" },
    units: { toman: "تومان", hour: "ساعت", min: "دقیقه", space: "جا" },
    theme: { light: "روشن", dark: "تاریک" },
  },
  en: {
    dir: "ltr",
    brand: "ParkHooshmand",
    brandSub: "City curbside parking system",
    nav: { map: "Live map", zones: "Zones", pricing: "Dynamic pricing", dashboard: "City dashboard", api: "Open data" },
    cta: { start: "Find parking", dashboard: "City dashboard", continue: "Continue", back: "Back", see: "See details", close: "Close" },
    hero: {
      badge: "Live data from 8,700 sensors",
      title1: "Find your space,",
      title2: "don't",
      title3: "circle the block.",
      lead: "Built on the SFpark model: real-time availability for every block, with rates that follow measured demand so one or two spaces always stay open.",
      s1: "Open spaces now", s2: "Average occupancy", s3: "Search time saved", s4: "Sensor health",
      minute: "min",
    },
    map: {
      title: "Live parking map",
      lead: "Every dot is a parking zone; its colour shows real-time occupancy. Tap one for the details.",
      legend: { open: "Open", moderate: "Moderate", busy: "Busy", full: "Full" },
      live: "Live updates",
      offline: "Live feed offline",
    },
    zones: {
      title: "Parking zones",
      lead: "Search, sort and pick the best option nearby.",
      search: "Search zones…",
      sort: { occupancy: "Least busy", rate: "Lowest price", free: "Most spaces", name: "Name" },
      kind: { all: "All", street: "Curbside", garage: "Garage" },
      onlyAvailable: "Available only",
      empty: "Nothing found. Try another word.",
      free: "free", capacity: "Capacity", rate: "Hourly rate", occupancy: "Occupancy",
    },
    panel: {
      rateNow: "Rate right now", perHour: "Toman / hour", base: "Base rate",
      history: "Last 24 hours", forecast: "Next 8 hours", changes: "Recent rate changes",
      sensors: "Sensors", revenue: "Revenue today", district: "District",
      start: "Start a session", plate: "Plate number", duration: "Duration", amount: "Amount",
      pay: "Pay from wallet", success: "Your session is active", full: "This zone is full",
      noMoney: "Wallet balance is not enough",
      eventNow: "Event pricing is active",
    },
    pricing: {
      title: "Demand-responsive pricing",
      lead: "Rates move slowly, in small steps, to keep occupancy between 70% and 85% — so a space is always findable.",
      up: "Above 85% occupied → one step up",
      hold: "Between 70–85% → rate holds",
      down: "Below 70% occupied → one step down",
      step: "Max change per adjustment", target: "Target occupancy band", event: "Special event pricing",
      eventLead: "On event days, nearby zones are re-priced automatically.",
      soon: "min away", running: "Running now",
    },
    dash: {
      title: "City dashboard",
      lead: "Operations view for the city: occupancy, revenue, sensor health and the effect of pricing policy.",
      kpi: { capacity: "Total capacity", occupied: "Occupied", revenue: "Revenue today", rate: "Average rate", co2: "CO₂ avoided", health: "Sensor health" },
      curve: "Average occupancy across the day", top: "Busiest zones", feed: "Live feed", events: "City events",
      million: "M Toman", kg: "kg",
    },
    api: {
      title: "Open data & public API",
      lead: "The same path SFpark took: open, documented, free data for city developers.",
      try: "Try it",
    },
    footer: { made: "Built on the SFpark model for Iranian cities", rights: "All rights reserved" },
    units: { toman: "Toman", hour: "hour", min: "min", space: "spaces" },
    theme: { light: "Light", dark: "Dark" },
  },
} as const;

export type Dict = (typeof dict)["en"];

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function fmt(n: number, lang: Lang, digits = 0): string {
  const s = n.toLocaleString(lang === "fa" ? "en-US" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return lang === "fa"
    ? s.replace(/\d/g, (d) => FA_DIGITS[+d]).replace(/,/g, "٬").replace(/\./g, "٫")
    : s;
}

export function pct(v: number, lang: Lang) {
  return fmt(Math.round(v * 100), lang) + (lang === "fa" ? "٪" : "%");
}
