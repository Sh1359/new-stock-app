# Shazim Stock Management — App Concept & পরামর্শ
**থিম:** হালকা অরেঞ্জ + অফ-হোয়াইট (প্রিমিয়াম লুক) | **তারিখ:** 27 Nov 2026

> এই ডকুমেন্টটি আপনার ৫টি CSV/Excel শিট গবেষণা করে তৈরি — যাতে Excel-এর কাজ পুরোপুরি Android App-এ নিয়ে আসা যায়।

---

## 1. আপনার বর্তমান Excel সিস্টেমে যা যা আছে (গবেষণার সারাংশ)

আপনার ফাইলগুলো পড়ে আমি পুরো workflow বুঝেছি:

| # | শিট (CSV) | কাজ |
|---|-----------|-----|
| 1 | **Dashboard** | Live summary: Total Scan, Shortage, Excess, Matched, Manual, Duplicate, Not Found, Invalid + টাকার হিসাব + Quick Lookup |
| 2 | **Stock_Taking** | Article Master: 1569টি Article, Cat, Price, System Stock, Physical Stock, Difference, Status (MATCH/SHORT/EXCESS), Variance Value |
| 3 | **Scan_Here (SCAN ON)** | স্ক্যান করার জায়গা। নিয়ম: লম্বা বারকোডের **প্রথম 7 digit = Article** (যেমন `8066063 → 806-6063`) |
| 4 | **Scan_Log** | 10,672টি স্ক্যান এন্ট্রি। প্রতিটি row-তে Full Barcode / Manual Article / Pair Qty / Time / Status / Operator / Notes |
| 5 | **How_To_Use** | বাংলা+English ব্যবহারবিধি |

### আপনার আসল সংখ্যা (14-Oct-2026 রিপোর্ট থেকে)
- **Total Articles:** 1,569টি | **Categories:** 02, 03, 04, 05, 06, 07, 08, 09, 11, 12, 13, 14, 17, 18, 20~25, 30, 31, 35, 36, 40, 42, 43, 45, 50, 51, 52, 53, 56, 60
- **System Stock:** 16,920 জোড়া | **মূল্য:** ৳2,34,91,830
- **Physical Stock:** 16,795 জোড়া | **মূল্য:** ৳2,32,23,383
- **Net Difference:** -125 জোড়া (৳-2,68,447)
- **Gross Shortage:** 251 জোড়া (৳3,35,259) — 99টি Article-এ SHORT
- **Excess:** 126 জোড়া (৳66,812) — 46টি Article-এ EXCESS
- **Matched:** 9,968 | **Manual Entry:** 659 | **Duplicate:** 37 | **Not Found:** 8 | **Invalid:** 0
- **সবচেয়ে বড় Shortage:** `551-6066` (-34), `814-6111` (-31, ৳-61,969), `577-9182` (-21)
- **Scan capacity:** 30,000 row পর্যন্ত (Excel-এর সীমা)

### স্ক্যান লজিক (খুব গুরুত্বপূর্ণ — App-এ হুবহু থাকবে)
1. **Full barcode scan** → প্রথম 7 character নিয়ে Article বানাও (`8646044... → 864-6044`)
2. **একই exact full barcode আবার স্ক্যান হলে = DUPLICATE** → Physical Stock বাড়বে না + লাল alert
3. **ভিন্ন barcode কিন্তু একই Article হলে = আলাদা count** → Physical Stock বাড়বে
4. **Manual entry:** কলাম B-তে 7 digit Article + কলাম C-তে Pair Qty (খালি = 1)
5. **NOT FOUND:** Article টি Stock_Taking লিস্টে নেই
6. **INVALID:** Manual entry 7 digit format-এ নেই

---

## 2. Excel-এ আপনার বর্তমান কষ্ট (কেন App দরকার)

1. **একজনই কাজ করতে পারে** — একসাথে ২-৩ জন গোডাউনে count করতে পারে না
2. **আসল Scan Time নেই** — পুরনো সব entry-তে DEMO timestamp (`14-Oct-2026 00:00:00`)
3. **Sound/vibration alert নেই** — Duplicate হলে বোঝা যায় না (VBA ছিল না)
4. **মোবাইলে চলে না** — গোডাউনে laptop + USB scanner নিয়ে ঘুরতে হয়
5. **30,000 row সীমা** — বড় stock-এ আটকে যাবে
6. **ভুল Operator/Notes entry** — Scan log-এ দেখলাম Operator ঘরে উল্টাপাল্টা বারকোড/সংখ্যা ঢুকে গেছে
7. **ছবির প্রমাণ নেই** — damage/excess item-এর photo রাখা যায় না
8. **Formula নষ্ট হওয়ার ভয়** — ভুল করে D/E/F/G/H/I/J/M কলাম মুছে গেলে পুরো হিসাব শেষ
9. **Filter ধীর** — 10,000+ row-তে DUPLICATE/NOT FOUND খোঁজা কষ্টকর
10. **রিপোর্ট শেয়ার কঠিন** — মালিক/ম্যানেজারকে সাথে সাথে PDF পাঠানো যায় না

---

## 3. Shazim Stock Management — App-এর মূল ধারণা

> **এক লাইনে:** গোডাউনে দাঁড়িয়ে মোবাইল দিয়েই স্ক্যান → সাথে সাথে Shortage/Excess হিসাব → এক ক্লিকে সুন্দর PDF রিপোর্ট।

**৫টি Excel শিট → App-এর ৫টি সেকশন:**

| Excel শিট | App সেকশন |
|-----------|-----------|
| Dashboard | 🏠 Home Dashboard (live cards + chart) |
| Scan_Here | 📷 Scan (camera + Bluetooth scanner + manual) |
| Stock_Taking | 📦 Stock (Article list + details) |
| Scan_Log | 🧾 Log (history + filter) |
| How_To_Use | ❓ Help (বাংলা টিউটোরিয়াল) |

---

## 4. App-এ যা যা রাখবেন (মূল মডিউল)

### 🏠 1) Home Dashboard (প্রিমিয়াম কার্ড ডিজাইন)
- উপরে: Godown নাম + Report Date + Session নাম
- বড় 4টি কার্ড: **Total Scan | Shortage | Excess | Not Found**
- দ্বিতীয় সারি: **Matched | Manual | Duplicate | Invalid**
- **Stock Reconciliation কার্ড:** System 16,920 → Physical 16,795 → Net -125 (টাকাসহ)
- **Shortage vs Excess বার/পাই চার্ট** (অরেঞ্জ vs সবুজ)
- **Quick Lookup সার্চ বার:** barcode বা `864-6044` লিখলেই সাথে সাথে status + row-এ জাম্প
- **Quick Actions:** New Scan / Stock List / Exceptions / Export Report

### 📷 2) Scan Screen (সবচেয়ে গুরুত্বপূর্ণ)
- **মোবাইলের ক্যামেরা দিয়েই বারকোড স্ক্যান** (আলাদা scanner মেশিন লাগবে না)
- **Bluetooth/USB scanner সাপোর্ট** — যাদের scanner আছে তারাও ব্যবহার পারবে
- **Manual entry:** 7 digit লিখুন + Pair Qty (খালি = 1)
- স্ক্যানের সাথে সাথে:
  - ✅ MATCHED → সবুজ টিক + হালকা vibration + Article নাম, System/Physical count দেখাবে
  - 🟠 DUPLICATE → লাল-অরেঞ্জ alert + জোরে beep + "এই barcode আগেই স্ক্যান হয়েছে"
  - 🔴 NOT FOUND → "এই Article লিস্টে নেই — যোগ করবেন?"
  - ⚠️ INVALID → "7 digit ঠিক করে লিখুন"
- **Continuous scan mode:** একটার পর একটা স্ক্যান, হাত থামাতে হবে না
- **Operator auto-tag:** কে স্ক্যান করলো auto save হবে (Excel-এর মতো ভুল হবে না)
- **Notes + Photo:** damage/tag-chhara item-এ ছবি তুলে রাখা যাবে

### 📦 3) Stock Taking / Article List
- 1,569টি Article-এর searchable list: Article, Cat, Price, System, Physical, Diff, Status
- Filter chips: **All | Short | Excess | Match | Zero Stock**
- Category filter (02, 03, 04...) + Price range filter
- প্রতিটি Article-এ ট্যাপ করলে Details: পুরো হিসাব + এই Article-এর সব scan history + variance টাকা
- Shortage Article গুলো উপরে red badge সহ

### 🧾 4) Scan Log / History
- সব স্ক্যানের list: barcode, article, qty, **আসল time**, operator, notes, photo
- Filter: MATCHED / MANUAL / DUPLICATE / NOT FOUND / INVALID / আজকের / Operator-wise
- Swipe করে ভুল entry delete/correct (Admin অনুমতি সহ, audit trail থাকবে)
- 30,000 সীমা নেই — **লাখ লাখ entry** রাখা যাবে

### ⚠️ 5) Exceptions Center (নতুন — Excel-এ ছিল না এভাবে)
- ৪টি ট্যাব: **Shortage (99) | Excess (46) | Not Found (8) | Duplicates (37)**
- প্রতিটি সমস্যা resolve করা যাবে: Recount / Accept / Add to Master / Ignore (কারণসহ)
- বড় shortage (যেমন -34, -31) গুলো "Priority Recount" হিসেবে উপরে থাকবে

### 📄 6) Reports & Export
- **Daily Stock Report PDF** — আপনার Stock_Taking শিটের মতো, নিচে *Store Stamp + Manager Sign* জায়গাসহ
- **Shortage/Excess Report** (টাকাসহ)
- **Scan Summary** (operator-wise কে কতটা scan করলো)
- **Excel/CSV Export** — পুরনো ফরম্যাটেই, যাতে POS/accountant-কে দেওয়া যায়
- **WhatsApp/Share** — এক ট্যাপে মালিককে PDF পাঠানো

### 🗂️ 7) Master Data & Sessions (নতুন ক্ষমতা)
- **Stock Count Session:** প্রতিটি counting-এর আলাদা session (যেমন "Oct-2026 Godown-A") — আগের session-এর সাথে তুলনা
- **System Stock Import:** POS/Excel থেকে System Stock import (CSV upload)
- **Article Master CRUD:** নতুন Article যোগ, Price/Cat edit
- **Godown/Location:** A/B/C zone বা Rack নম্বর দিয়ে ভাগ করে count

### 👥 8) Users, Backup & Settings
- **Multi-user:** Manager + Operator login, কে কী করলো তার audit log
- **Offline-first:** গোডাউনে net না থাকলেও full কাজ চলবে, net এলে auto sync
- **Cloud backup + restore** (Google Drive / Firebase)
- **বাংলা + English** ভাষা switch
- Dark mode (ঐচ্ছিক)

---

## 5. কী কী Integrate করা যেতে পারে (পরামর্শ)

| # | Integration | কেন দরকার | কখন |
|---|-------------|-----------|-----|
| 1 | **Camera barcode engine (ML Kit / ZXing)** | scanner মেশিন ছাড়াই মোবাইলে scan | Phase 1 (must) |
| 2 | **Bluetooth scanner support** | দ্রুত bulk scan, পুরনো scanner কাজে লাগবে | Phase 1 |
| 3 | **Excel/CSV Import-Export** | POS থেকে System Stock আনা + accountant-কে দেওয়া | Phase 1 |
| 4 | **Thermal printer (Bluetooth)** | Shortage list / barcode sticker print | Phase 1–2 |
| 5 | **PDF + WhatsApp share** | মালিককে instant রিপোর্ট | Phase 1 |
| 6 | **Firebase/Supabase sync** | একসাথে ৩-৪ জন count + cloud backup | Phase 2 |
| 7 | **POS API sync** (যদি POS থাকে) | System Stock auto update, হাতে import লাগবে না | Phase 2 |
| 8 | **Photo storage** | Damage/excess প্রমাণ | Phase 2 |
| 9 | **Smart suggestions** | "এই Article প্রায়ই short হয়" — সতর্কবার্তা | Phase 3 (ভবিষ্যৎ) |
| 10 | **Multi-branch** | একাধিক দোকান/গোডাউন এক App-এ | Phase 3 (ভবিষ্যৎ) |

---

## 6. App দেখতে কেমন হবে (হালকা অরেঞ্জ + অফ-হোয়াইট প্রিমিয়াম থিম)

### কালার প্যালেট (পরামর্শ)
| ব্যবহার | কালার | Hex |
|---------|-------|-----|
| Background | অফ-হোয়াইট | `#FFFBF4` |
| Card | খাঁটি সাদা | `#FFFFFF` |
| Primary (button/header) | প্রিমিয়াম অরেঞ্জ | `#F97316` |
| Light orange (badge/bg) | হালকা অরেঞ্জ | `#FFE3C2` |
| Soft border | ক্রিম | `#F5E6D3` |
| Text (heading) | গাঢ় বাদামি-কালো | `#3B2314` |
| Text (sub) | মিডিয়াম গ্রে-বাদামি | `#8A6F5C` |
| Success | পাতা-সবুজ | `#16A34A` |
| Danger | লাল | `#DC2626` |

### প্রিমিয়াম লুকের নিয়ম
- Splash screen: অফ-হোয়াইট ব্যাকগ্রাউন্ডে অরেঞ্জ **"Shazim" লোগো** + "Stock Management" ট্যাগলাইন
- Home header: হালকা **অরেঞ্জ gradient** (উপরে `#F97316` → নিচে `#FFB25C`), গোলাকার bottom corner
- কার্ড: সাদা, গোলাকার (16–20dp), হালকা shadow — সংখ্যা বড় ও bold
- Bottom navigation: 5টি — 🏠 Home | 📷 Scan (মাঝখানে বড় অরেঞ্জ বাটন) | 📦 Stock | 🧾 Log | ⋮ More
- Font: English — Poppins/Inter, বাংলা — Hind Siliguri / Noto Sans Bengali
- Chart: shortage = অরেঞ্জ/লাল, excess = সবুজ, matched = ধূসর-সবুজ
- প্রতিটি status-এর রঙিন badge: SHORT (লাল), EXCESS (সবুজ), MATCH (ধূসর), DUPLICATE (কমলা), NOT FOUND (গাঢ় লাল)

---

## 7. Technology পরামর্শ (সহজ ভাষায়)

- **App ফ্রেমওয়ার্ক:** Flutter (এক কোডে Android + ভবিষ্যতে iPhone) — অথবা Native Kotlin (শুধু Android, scanner-এর জন্য সেরা পারফরম্যান্স)
- **Database (মোবাইলে):** SQLite/Room/Hive — offline-এ লাখ entry সামলাবে
- **Barcode:** ML Kit (Google) — ফ্রি, দ্রুত, বাংলা সাপোর্ট সমস্যা নেই
- **Cloud (Phase 2):** Firebase — login, sync, backup
- **PDF/Excel:** in-app generate, কোনো PC লাগবে না

---

## 8. কীভাবে এগোবেন (Roadmap)

### ✅ Phase 1 — MVP (Excel বাদ দেওয়ার জন্য যথেষ্ট)
1. Article Master import (আপনার 1,569 Article + System Stock)
2. Scan (camera + manual + duplicate beep)
3. Live Dashboard + Quick Lookup
4. Stock list + Short/Excess filter
5. Scan Log + Exceptions
6. PDF + Excel export
7. Offline + backup

### 🚀 Phase 2 — Team & Power
- Multi-operator login + session + zone-wise count
- Bluetooth scanner + printer
- Photo proof + cloud sync
- POS import automation

### 🌟 Phase 3 — Smart (ভবিষ্যৎ)
- Multi-branch, trend chart, low-stock alert, demand hint

---

## 9. Excel → App ডেটা মাইগ্রেশন প্ল্যান

1. **Stock_Taking CSV → Article Master** (SL, Article, Cat, Price, System Stock)
2. **System Stock কলাম** = POS expected stock হিসেবে lock থাকবে
3. **Scan_Log CSV → History** (optional — পুরনো 10,672 entry archive হিসেবে রাখা যায়)
4. নতুন counting নতুন Session থেকে শুরু — Physical Stock শূন্য থেকে গণনা
5. প্রথমবার মিলিয়ে দেখা: App-এর Shortage/Excess = Excel-এর 251/126 মিলছে কিনা

---

## 10. আমার চূড়ান্ত পরামর্শ

1. **Scan screen-কে সবচেয়ে সহজ রাখুন** — বড় viewfinder, বড় beep, বড় Article নাম। গোডাউনের আলো কম থাকে।
2. **Duplicate beep বাধ্যতামূলক** — Excel-এ যা ছিল না, সেটাই App-এর সবচেয়ে বড় লাভ।
3. **Operator login রাখুন** — ভুলের দায় কার, সেটা জানা যাবে; Excel-এ এই কলাম নষ্ট হয়ে গেছে।
4. **প্রথমে শুধু Phase 1 বানান** — 2–3 সপ্তাহ ব্যবহার করে তারপর Phase 2-এর সিদ্ধান্ত নিন।
5. **থিমে অরেঞ্জ বেশি গাঢ় করবেন না** — হালকা অরেঞ্জ + অফ-হোয়াইটই প্রিমিয়াম লাগে, চোখেও আরাম।

---

*পরবর্তী ধাপ: আপনি চাইলে আমি এই repo-তেই Phase 1-এর App skeleton + Dashboard + Scan UI (অরেঞ্জ/অফ-হোয়াইট থিমে) বানিয়ে দিতে পারি। শুধু বলুন — **Flutter না Native Android (Kotlin)?***
