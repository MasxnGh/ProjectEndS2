/*
 * Shared shell for the Phase 1 prototypes: icons, logo, header, footer,
 * place-card and tile renderers, Thai formatters, and the Tweaks panel.
 * Data comes from catalogue.js (generated from the app's real data).
 */
(function () {
  const C = window.CATALOGUE;

  /* ---------- Icons (lucide geometry, 24px grid) ---------- */
  const P = {
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    arrowLeft: '<path d="M19 12H5M11 19l-7-7 7-7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
    temple: '<path d="M12 2v3M10 5h4l1 4H9zM7.5 9h9l1.5 5h-12zM5 14h14l1.5 4h-17zM3 22h18M5 18v4M19 18v4M10 22v-3h4v3"/>',
    mountain: '<path d="m3 20 6.5-11 4 6 2.5-3.5L21 20Z"/><path d="m8 11.5 1.5 1.5 1.5-1.5"/>',
    home: '<path d="M3 10.5 12 3l9 7.5M5 9v12h14V9M10 21v-6h4v6"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM6 2v2M10 2v2M14 2v2"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    store: '<path d="M3 9 4.5 4h15L21 9M3 9h18a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0ZM5 12v9h14v-9M10 21v-5h4v5"/>',
    landmark: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l9 5H3z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    sunset: '<path d="M12 10V2M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M16 6l-4 4-4-4M16 18a4 4 0 0 0-8 0"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    map: '<path d="M14.1 5.6a2 2 0 0 0 1.8 0l3.7-1.9A1 1 0 0 1 21 4.6v12.8a1 1 0 0 1-.6.9l-4.5 2.3a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.7 1.9A1 1 0 0 1 3 19.4V6.6a1 1 0 0 1 .6-.9l4.5-2.3a2 2 0 0 1 1.8 0zM15 5.8v15M9 3.2v15"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    nav: '<path d="M3 11l19-9-9 19-2-8-8-2z"/>',
    shirt: '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.2a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.4-2.2z"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z"/>',
    user: '<circle cx="12" cy="8" r="4.5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    wind: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  };
  const icon = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ""}</svg>`;

  /* ---------- Logo (redrawn from the brand board; final artwork pending) ---------- */
  const mark = (accent = "var(--sunset-orange)") => `
    <svg viewBox="0 0 64 44" aria-hidden="true">
      <path d="M32 2.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="${accent}"/>
      <path d="M3 41 19 18l7.5 9.5L38 12l23 29" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M33 19.5 38 25l4-4" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M14 41 26.5 27.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  const logo = (href = "home.html") => `
    <a class="logo" href="${href}" aria-label="Chiangmai Journey หน้าแรก">
      ${mark()}
      <span class="word"><span>Chiangmai</span><span>Journey</span></span>
    </a>`;
  const brush = `<svg class="brush" viewBox="0 0 96 12" aria-hidden="true"><path d="M3 8.5C22 4 52 2.5 93 5.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;

  /* ---------- Thai labels and formatters ---------- */
  const CAT = {
    temple: { th: "วัดวาอาราม", icon: "temple", photo: "wat-phra-singh" },
    nature: { th: "ธรรมชาติ", icon: "mountain", photo: "kew-mae-pan-nature-trail" },
    village: { th: "หมู่บ้าน & วัฒนธรรม", icon: "home", photo: "wiang-kum-kam" },
    market: { th: "ตลาด & ของกิน", icon: "store", photo: "saturday-walking-street-wualai" },
    museum: { th: "พิพิธภัณฑ์ & ศิลปะ", icon: "landmark", photo: "chiang-mai-city-arts-cultural-centre" },
    cafe: { th: "คาเฟ่ & ย่านฮิป", icon: "coffee", photo: null, tone: "sand" },
    restaurant: { th: "ร้านอาหาร", icon: "utensils", photo: null, tone: "leaf" },
    activity: { th: "กิจกรรม", icon: "compass", photo: null, tone: "lav" },
  };
  const CAT_ORDER = ["temple", "nature", "cafe", "restaurant", "village", "market", "museum", "activity"];
  const ZONE = { inside: "ในกำแพงเมือง", wall: "ริมคูเมือง", north: "เหนือคูเมือง", east: "ตะวันออก ทางแม่น้ำปิง", south: "ใต้คูเมือง", west: "ตะวันตก ทางดอยสุเทพ", beyond: "นอกเมือง" };
  const DISTRICT = { "old-city": "เมืองเก่า", nimman: "นิมมานเหมินท์", santitham: "สันติธรรม", riverside: "ริมปิง", "chang-klan": "ช้างคลาน", "doi-suthep": "ดอยสุเทพ", "doi-inthanon": "ดอยอินทนนท์", "mae-rim": "แม่ริม", "mae-kampong": "แม่กำปอง", "san-kamphaeng": "สันกำแพง", "san-sai": "สันทราย", "chiang-dao": "เชียงดาว", "chom-thong": "จอมทอง", saraphi: "สารภี", "mae-wang": "แม่วาง", "hang-dong": "หางดง", samoeng: "สะเมิง", "chiang-mai-city": "ตัวเมืองเชียงใหม่", "mae-ai": "แม่อาย", fang: "ฝาง", "chai-prakan": "ไชยปราการ", "wiang-haeng": "เวียงแหง", phrao: "พร้าว", "mae-taeng": "แม่แตง", "doi-saket": "ดอยสะเก็ด", "mae-on": "แม่ออน", "galyani-vadhana": "กัลยาณิวัฒนา", "san-pa-tong": "สันป่าตอง", hot: "ฮอด", omkoi: "อมก๋อย", "doi-tao": "ดอยเต่า" };
  const dur = (m) => {
    m = Math.round(m);
    const h = Math.floor(m / 60), r = m % 60;
    return h && r ? `${h} ชม. ${r} นาที` : h ? `${h} ชม.` : `${r} นาที`;
  };
  const price = (n) => "฿".repeat(n);
  const km = (x) => `${x.toLocaleString("th-TH", { maximumFractionDigits: 1 })} กม.`;
  const baht = (x) => `฿${Math.round(x).toLocaleString("th-TH")}`;
  // District name, plus the city-wall zone only where it adds something (in or beside the old city)
  const where = (p) => (DISTRICT[p.d] || ZONE[p.zone]) + (p.zone === "inside" || p.zone === "wall" ? ` · ${ZONE[p.zone]}` : "");
  const bySlug = (s) => C.places.find((p) => p.s === s);
  const img = (slug) => `/images/places/${slug}.jpg`;

  const media = (p, cls = "") =>
    p.photo
      ? `<div class="photo graded media ${cls}"><img src="${img(p.s)}" alt="${p.th}" loading="lazy"></div>`
      : `<div class="noimg media ${cls}" role="img" aria-label="${CAT[p.c].th} · ${ZONE[p.zone]} (ยังไม่มีภาพถ่าย)"><span class="ring">${icon(CAT[p.c].icon, "i--lg")}</span><span class="zone">${DISTRICT[p.d] || ZONE[p.zone]}</span></div>`;

  /* The board's card shows "4.8 (12k+)" here; we show only true facts. */
  const placeCard = (p, { stack = false, fav = true } = {}) => `
    <article class="pcard ${stack ? "pcard--stack" : ""}">
      ${media(p)}
      ${fav ? `<button class="icon-btn fav" aria-label="บันทึก ${p.th} ไว้ในรายการโปรด" aria-pressed="false">${icon("heart", "i--sm")}</button>` : ""}
      <div class="body">
        <h3><a href="place.html?s=${p.s}">${p.th}</a></h3>
        <p class="loc">${icon("pin", "i--sm")}${where(p)}</p>
        <p class="meta num">${CAT[p.c].th} · อยู่ราว ${dur(p.dur)} · ${price(p.price)}</p>
      </div>
      <span class="icon-btn icon-btn--brand go" aria-hidden="true">${icon("arrow", "i--sm")}</span>
    </article>`;

  const catTile = (key) => {
    const c = CAT[key];
    const n = C.places.filter((p) => p.c === key).length;
    const bg = c.photo ? `<div class="photo graded"><img src="${img(c.photo)}" alt="" loading="lazy"></div>` : "";
    return `<a class="ctile ${c.photo ? "" : "ctile--" + c.tone}" href="explore.html?category=${key}">
      ${bg}${icon(c.icon, "i--xl")}<span class="name">${c.th}</span><span class="count num">${n} แห่ง</span></a>`;
  };

  /* ---------- Header / footer ---------- */
  const NAV = [
    ["home", "หน้าแรก", "home.html"],
    ["explore", "สำรวจ", "explore.html", true],
    ["guides", "คู่มือ", "guides.html"],
    ["about", "เกี่ยวกับเรา", "about.html"],
  ];
  function header(active) {
    const links = NAV.map(([k, label, href, dd]) =>
      dd
        ? `<div class="dropdown" data-dropdown><button class="navlink" aria-expanded="false" ${active === k ? 'aria-current="page"' : ""}>${label}${icon("down", "i--sm")}</button>
            <div class="dropdown-panel">${CAT_ORDER.map((c) => `<a href="explore.html?category=${c}"><span class="ic">${icon(CAT[c].icon)}</span><span class="t-label">${CAT[c].th}<small class="num">${C.places.filter((p) => p.c === c).length} แห่ง</small></span></a>`).join("")}</div></div>`
        : `<a href="${href}" ${active === k ? 'aria-current="page"' : ""}>${label}</a>`
    ).join("");
    return `<a class="skip" href="#main">ข้ามไปเนื้อหา</a>
    <header class="site-header"><div class="wrap bar">
      ${logo()}
      <nav class="nav" aria-label="เมนูหลัก">${links}</nav>
      <div class="header-actions">
        <a class="icon-btn icon-btn--plain" href="explore.html" aria-label="ค้นหาสถานที่">${icon("search")}</a>
        <a class="btn btn--primary btn--sm" href="planner.html" ${active === "planner" ? 'aria-current="page"' : ""}>วางแผนทริป ${icon("arrow", "i--sm i--arrow")}</a>
        <button class="icon-btn icon-btn--plain menu-btn" aria-label="เปิดเมนู" data-open-sheet>${icon("menu")}</button>
      </div>
    </div></header>
    <div class="sheet" data-sheet><div class="scrim" data-close-sheet></div><div class="panel" role="dialog" aria-label="เมนู">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">${logo()}<button class="icon-btn icon-btn--plain" aria-label="ปิดเมนู" data-close-sheet>${icon("x")}</button></div>
      ${NAV.map(([k, l, h]) => `<a class="big" href="${h}">${l}${icon("right")}</a>`).join("")}
      <a class="big" href="planner.html">วางแผนทริป${icon("right")}</a>
      <div class="row"><button class="chip">${icon("globe", "i--sm")} English</button><button class="chip" data-theme-toggle>${icon("moon", "i--sm")} โหมดมืด</button></div>
      <a class="btn btn--secondary" style="margin-top:16px" href="#">${icon("user", "i--sm")} เข้าสู่ระบบด้วย Google</a>
    </div></div>`;
  }
  function footer() {
    return `<footer class="site-footer"><div class="wrap top">
      <div>${logo()}<p class="tagline">ออกเดินทางไปเชียงใหม่ ในแบบที่เป็นคุณ — คู่มือที่คัดมาเอง กับตัววางแผนที่คิดเวลาเดินทางจริง</p></div>
      <div><h3>สำรวจ</h3><ul>${CAT_ORDER.slice(0, 5).map((c) => `<li><a href="explore.html?category=${c}">${CAT[c].th}</a></li>`).join("")}</ul></div>
      <div><h3>วางแผน</h3><ul><li><a href="planner.html">วางแผนทริป</a></li><li><a href="planner.html">ทริปตัวอย่าง</a></li><li><a href="#">ทริปของฉัน</a></li><li><a href="#">รายการโปรด</a></li></ul></div>
      <div><h3>เกี่ยวกับ</h3><ul><li><a href="about.html">เกี่ยวกับเรา</a></li><li><a href="guides.html">คู่มือ</a></li><li><a href="#">เครดิตภาพและข้อมูล</a></li><li><a href="#">ความเป็นส่วนตัว</a></li><li><a href="#">ข้อกำหนด</a></li></ul></div>
    </div><div class="wrap bottom"><span>© 2569 Chiangmai Journey · โปรเจกต์จบ วิทยาลัยเทคนิคเชียงใหม่</span><span>ข้อมูลสภาพอากาศจาก Open-Meteo · แผนที่ © MapTiler © OpenStreetMap</span></div></footer>`;
  }

  /* ---------- Tweaks (design review only) ---------- */
  function tweaks() {
    return `<button class="icon-btn icon-btn--brand tweaks-toggle" aria-label="Tweaks" data-tweaks-toggle>${icon("sliders")}</button>
    <div class="tweaks" data-tweaks><h2>Tweaks</h2>
      <div class="t-small t-muted">ธีม</div><div class="seg"><button class="chip" data-set-theme="light">สว่าง</button><button class="chip" data-set-theme="dark">มืด</button></div>
      <div class="t-small t-muted">เกรดสีภาพ</div><div class="seg"><button class="chip" data-grade="on">แสงทอง</button><button class="chip" data-grade="off">ภาพดิบ</button></div>
    </div>`;
  }
  const setTheme = (t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem("cmj-theme", t); } catch {} };
  try { const t = localStorage.getItem("cmj-theme"); if (t) document.documentElement.dataset.theme = t; } catch {}

  function mount(active) {
    document.body.insertAdjacentHTML("afterbegin", header(active));
    if (active !== "planner-bare") document.body.insertAdjacentHTML("beforeend", footer());
    document.body.insertAdjacentHTML("beforeend", tweaks());
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a");
      if (!t) {
        document.querySelectorAll("[data-dropdown]").forEach((d) => (d.dataset.open = "false"));
        return;
      }
      const dd = t.closest("[data-dropdown]");
      if (dd && t.matches(".navlink")) {
        const open = dd.dataset.open !== "true";
        dd.dataset.open = open; t.setAttribute("aria-expanded", open);
      }
      if (t.matches("[data-open-sheet]")) document.querySelector("[data-sheet]").dataset.open = "true";
      if (t.matches("[data-close-sheet]")) document.querySelector("[data-sheet]").dataset.open = "false";
      if (t.matches("[data-tweaks-toggle]")) { const p = document.querySelector("[data-tweaks]"); p.dataset.open = p.dataset.open !== "true"; }
      if (t.matches("[data-set-theme]")) setTheme(t.dataset.setTheme);
      if (t.matches("[data-theme-toggle]")) setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      if (t.matches("[data-grade]")) document.querySelectorAll(".photo").forEach((ph) => ph.classList.toggle("graded", t.dataset.grade === "on"));
      if (t.matches(".fav")) { e.preventDefault(); t.setAttribute("aria-pressed", t.getAttribute("aria-pressed") !== "true"); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll("[data-dropdown]").forEach((d) => (d.dataset.open = "false"));
        const s = document.querySelector("[data-sheet]"); if (s) s.dataset.open = "false";
      }
    });
  }

  window.UI = { where, icon, mark, logo, brush, CAT, CAT_ORDER, ZONE, DISTRICT, dur, price, km, baht, bySlug, img, media, placeCard, catTile, mount, C };
})();
