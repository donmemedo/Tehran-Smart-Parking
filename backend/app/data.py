"""Seed data for the Tehran smart-curbside-parking pilot (SFpark-inspired)."""

# id, fa name, en name, district, kind, capacity, base rate (Toman/hour), x, y (map grid 0..100)
ZONE_SEED = [
    ("TJR", "تجریش", "Tajrish", 1, "street", 420, 24000, 52, 8),
    ("VLS", "ولیعصر شمالی", "North Valiasr", 3, "street", 610, 22000, 46, 20),
    ("MLT", "میدان ملت", "Mellat Square", 3, "garage", 380, 18000, 58, 26),
    ("SDJ", "سعادت‌آباد", "Saadat Abad", 2, "street", 540, 20000, 26, 22),
    ("ARG", "ونک", "Vanak", 6, "street", 720, 26000, 48, 34),
    ("JRD", "جردن", "Jordan", 3, "street", 460, 25000, 57, 33),
    ("ENQ", "میدان انقلاب", "Enghelab Square", 6, "street", 830, 16000, 44, 52),
    ("BZR", "بازار بزرگ", "Grand Bazaar", 12, "street", 910, 14000, 50, 66),
    ("TTR", "تئاتر شهر", "City Theatre", 11, "garage", 300, 15000, 41, 55),
    ("AZD", "آزادی", "Azadi", 9, "street", 640, 12000, 22, 56),
    ("SHR", "شهرک غرب", "Shahrak-e Gharb", 2, "garage", 500, 21000, 18, 30),
    ("NRM", "نارمک", "Narmak", 8, "street", 470, 10000, 76, 46),
    ("PNK", "پونک", "Punak", 5, "street", 520, 11000, 16, 40),
    ("HFT", "هفت تیر", "Haft-e Tir", 7, "street", 580, 19000, 50, 44),
    ("MRD", "میرداماد", "Mirdamad", 3, "street", 490, 23000, 60, 30),
    ("QYM", "قیطریه", "Gheytarieh", 1, "street", 350, 20000, 62, 14),
]

EVENT_SEED = [
    {
        "id": "EV-AZD-1",
        "zone_id": "AZD",
        "title_fa": "دیدار پرسپولیس – استقلال، ورزشگاه آزادی",
        "title_en": "Derby match, Azadi Stadium",
        "starts_in_min": 180,
        "duration_min": 240,
        "multiplier": 2.2,
    },
    {
        "id": "EV-TTR-1",
        "zone_id": "TTR",
        "title_fa": "اجرای نمایش، تئاتر شهر",
        "title_en": "Evening show, City Theatre",
        "starts_in_min": 300,
        "duration_min": 180,
        "multiplier": 1.5,
    },
    {
        "id": "EV-BZR-1",
        "zone_id": "BZR",
        "title_fa": "بازارچه نوروزی",
        "title_en": "Nowruz street market",
        "starts_in_min": 60,
        "duration_min": 360,
        "multiplier": 1.4,
    },
]

# Demand-responsive pricing policy (SFpark rule of thumb)
POLICY = {
    "target_low": 0.70,
    "target_high": 0.85,
    "step": 1000,          # Toman per adjustment
    "min_rate": 6000,
    "max_rate": 60000,
    "max_change_per_day": 3000,
}
