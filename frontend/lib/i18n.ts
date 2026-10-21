export type Lang = "fa" | "en";

/* Persian copy follows the Persian UX-writing vocabulary guide:
   «جستجو», «تایید», «حذف», «مبلغ» for amounts reported to the user and «قیمت» for the value of a
   thing, «نادرست» rather than «اشتباه», never blaming the user, plural «ها» (never «ات»). */
const fa = {
  dir: "rtl" as "rtl" | "ltr",
  brand: "پارک هوشمند",
  brandSub: "سامانه پارک حاشیه‌ای شهر",
  nav: { map: "نقشه زنده", zones: "محدوده‌ها", pricing: "قیمت‌گذاری پویا", dashboard: "پیش‌خوان شهر", api: "داده باز" },
  cta: { start: "پیدا کردن جای پارک", dashboard: "پیش‌خوان شهر", continue: "ادامه", back: "بازگشت", see: "نمایش جزئیات", close: "بستن" },
  a11y: {
    language: "زبان",
    menu: "منو",
    wallet: "کیف پول",
    toLight: "تغییر به حالت روشن",
    toDark: "تغییر به حالت تاریک",
  },
  hero: {
    badge: "داده لحظه‌ای از ۸٬۷۰۰ حسگر",
    title1: "جای پارک را",
    title2: "پیدا کنید",
    title3: "نه اینکه دنبالش بگردید.",
    lead: "با الگوی SFpark، جای خالی هر بلوک را لحظه‌ای می‌بینید و قیمت بر پایه تقاضای واقعی تنظیم می‌شود تا همیشه یکی دو جای خالی بماند.",
    s1: "جای خالی همین حالا", s2: "میانگین اشغال", s3: "زمان صرفه‌جویی‌شده", s4: "سلامت حسگرها",
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
    lead: "جستجو کنید، مرتب کنید و بهترین گزینه را انتخاب کنید.",
    search: "جستجو در محدوده‌ها…",
    searchLabel: "جستجو در محدوده‌ها",
    sortLabel: "مرتب‌سازی",
    sort: { occupancy: "کمترین اشغال", rate: "کمترین قیمت", free: "بیشترین جای خالی", name: "نام" },
    kind: { all: "همه", street: "حاشیه‌ای", garage: "پارکینگ" },
    onlyAvailable: "فقط جای خالی",
    empty: "چیزی پیدا نشد. واژه دیگری را امتحان کنید.",
    free: "جای خالی", capacity: "ظرفیت", rate: "نرخ ساعتی", occupancy: "اشغال",
  },
  panel: {
    rateNow: "نرخ همین حالا", perHour: "تومان / ساعت", base: "نرخ پایه",
    history: "تاریخچه ۲۴ ساعت", forecast: "پیش‌بینی ۸ ساعت آینده", changes: "تغییرهای اخیر نرخ",
    sensors: "حسگرها", revenue: "درآمد امروز", district: "منطقه",
    loading: "در حال دریافت…",
    start: "شروع توقف", plate: "شماره پلاک", duration: "مدت توقف", amount: "مبلغ",
    zone: "محدوده",
    plateHint: "حرف، عدد، فاصله و خط تیره؛ ۲ تا ۱۶ نویسه",
    plateErr: {
      required: "شماره پلاک را بنویسید.",
      length: "شماره پلاک باید ۲ تا ۱۶ نویسه باشد.",
      chars: "فقط حرف، عدد، فاصله و خط تیره قابل‌قبول است.",
    },
    review: "بررسی پرداخت",
    reviewTitle: "خلاصه پرداخت",
    confirm: "تایید و پرداخت",
    paying: "در حال پرداخت…",
    payFrom: "مبلغ از کیف پول شما کسر می‌شود.",
    priceChanged: "مبلغ تغییر کرده است. مبلغ جدید را ببینید و دوباره تایید کنید.",
    success: "توقف شما ثبت شد", full: "این محدوده پر است",
    eventNow: "قیمت‌گذاری رویداد فعال است",
    err: {
      auth: "تایید هویت انجام نشد. دوباره امتحان کنید.",
      funds: "موجودی کیف پول کافی نیست.",
      full: "ظرفیت این محدوده تکمیل شده است.",
      tooMany: "تعداد توقف‌های فعال شما به سقف مجاز رسیده است.",
      invalid: "اطلاعات واردشده پذیرفته نشد. پلاک و مدت توقف را بررسی کنید.",
      rate: "تعداد درخواست‌ها زیاد بود. {n} ثانیه دیگر دوباره امتحان کنید.",
      rateNoWait: "تعداد درخواست‌ها زیاد بود. کمی بعد دوباره امتحان کنید.",
      network: "اتصال برقرار نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.",
      generic: "مشکلی پیش آمد. کمی بعد دوباره امتحان کنید.",
    },
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
    lead: "نمای عملیاتی برای شهرداری: اشغال، درآمد، سلامت حسگرها و اثر سیاست قیمت.",
    kpi: { capacity: "ظرفیت کل", occupied: "اشغال‌شده", revenue: "درآمد امروز", rate: "میانگین نرخ", co2: "کاهش آلایندگی", health: "سلامت حسگرها" },
    curve: "میانگین اشغال در شبانه‌روز", top: "پرتقاضاترین محدوده‌ها", feed: "رویدادهای زنده", events: "رویدادهای شهر",
    million: "میلیون تومان", kg: "کیلوگرم",
  },
  api: {
    title: "داده باز و API عمومی",
    lead: "همان مسیری که SFpark رفت: داده باز، مستند و رایگان برای توسعه‌دهندگان شهر.",
    try: "امتحان کنید",
    desc: {
      zones: "جای خالی و نرخ لحظه‌ای هر محدوده",
      zone: "تاریخچه اشغال، پیش‌بینی و تغییرهای نرخ",
      overview: "شاخص‌های کل شهر و منحنی اشغال در شبانه‌روز",
      geojson: "خروجی GeoJSON برای نقشه و پژوهش",
      ws: "جریان زنده؛ هر ۵ ثانیه یک به‌روزرسانی",
    },
  },
  error: {
    title: "مشکلی پیش آمد",
    body: "نمایش این صفحه کامل نشد. دوباره امتحان کنید.",
    retry: "امتحان دوباره",
  },
  footer: { made: "ساخته‌شده بر پایه الگوی SFpark برای شهرهای ایران", rights: "همه حقوق محفوظ است" },
  units: { toman: "تومان", hour: "ساعت", min: "دقیقه", space: "جا" },
  theme: { light: "روشن", dark: "تاریک" },
};

/** Every key in `fa` must exist in `en` (and vice versa): the compiler enforces parity. */
export type Dict = typeof fa;

const en: Dict = {
  dir: "ltr",
  brand: "ParkHooshmand",
  brandSub: "City curbside parking system",
  nav: { map: "Live map", zones: "Zones", pricing: "Dynamic pricing", dashboard: "City dashboard", api: "Open data" },
  cta: { start: "Find parking", dashboard: "City dashboard", continue: "Continue", back: "Back", see: "See details", close: "Close" },
  a11y: {
    language: "Language",
    menu: "Menu",
    wallet: "Wallet",
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
  },
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
    searchLabel: "Search zones",
    sortLabel: "Sort by",
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
    loading: "Loading…",
    start: "Start a session", plate: "Plate number", duration: "Duration", amount: "Amount",
    zone: "Zone",
    plateHint: "Letters, digits, spaces and hyphens; 2 to 16 characters",
    plateErr: {
      required: "Enter the plate number.",
      length: "The plate number needs 2 to 16 characters.",
      chars: "Only letters, digits, spaces and hyphens are accepted.",
    },
    review: "Review payment",
    reviewTitle: "Payment summary",
    confirm: "Confirm and pay",
    paying: "Paying…",
    payFrom: "The amount is taken from your wallet.",
    priceChanged: "The amount has changed. Check the new amount and confirm again.",
    success: "Your session is active", full: "This zone is full",
    eventNow: "Event pricing is active",
    err: {
      auth: "We could not verify this device. Please try again.",
      funds: "Your wallet balance is not enough.",
      full: "This zone has just filled up.",
      tooMany: "You have reached the limit of active sessions.",
      invalid: "Those details were not accepted. Check the plate and the duration.",
      rate: "Too many requests. Try again in {n} seconds.",
      rateNoWait: "Too many requests. Try again in a moment.",
      network: "Could not connect. Check your internet and try again.",
      generic: "Something went wrong. Please try again shortly.",
    },
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
    desc: {
      zones: "Live availability and rates for every zone",
      zone: "Occupancy history, forecast and rate changes",
      overview: "City-wide KPIs and the daily occupancy curve",
      geojson: "GeoJSON feed for maps and research",
      ws: "Push stream, one update every 5 seconds",
    },
  },
  error: {
    title: "Something went wrong",
    body: "This page could not be shown in full. Please try again.",
    retry: "Try again",
  },
  footer: { made: "Built on the SFpark model for Iranian cities", rights: "All rights reserved" },
  units: { toman: "Toman", hour: "hour", min: "min", space: "spaces" },
  theme: { light: "Light", dark: "Dark" },
};

export const dict: Record<Lang, Dict> = { fa, en };

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function fmt(n: number, lang: Lang, digits = 0): string {
  const s = n.toLocaleString("en-US", {
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

/** Fill `{name}` placeholders in a translated string. */
export function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Fold the Arabic/Persian look-alikes people type (ي ك, Arabic-Indic digits, ZWNJ) so search matches. */
export function foldSearch(s: string): string {
  return s
    .replace(/[يى]/g, "ی") // ي ى -> ی
    .replace(/ك/g, "ک") // ك -> ک
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[‌‏‎]/g, "")
    .toLowerCase()
    .trim();
}
