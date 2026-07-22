import type { Guide } from "./types";

export const guides: Guide[] = [
  {
    slug: "48-hours-in-nimman",
    title: { en: "48 Hours in Nimman", th: "48 ชั่วโมงในนิมมาน" },
    dek: {
      en: "A slow itinerary through Chiang Mai's design district — coffee, concept stores, and rooftop nights.",
      th: "แผนการเดินทางแบบช้าๆ ผ่านย่านดีไซน์ของเชียงใหม่ — กาแฟ ร้านคอนเซ็ปต์ และค่ำคืนบนรูฟท็อป",
    },
    coverSeed: 4,
    readMinutes: 6,
    publishedAt: "2026-01-14",
    relatedPlaceSlugs: ["nimmanhaemin", "old-city-coffee-trail", "ban-kang-wat"],
    sections: [
      {
        heading: { en: "Morning: coffee before the crowds", th: "เช้า: กาแฟก่อนผู้คนจะมาถึง" },
        body: {
          en: "Nimman wakes up slowly, which is exactly the point. Start at a soi 1 roaster before 9 AM, when the concept stores are still shuttered and the sois belong to bicycle deliveries and shopkeepers sweeping their thresholds. Order a single-origin filter rather than the espresso menu — Northern Thai beans are having a genuine moment, and the quieter hour is the best time to actually taste one.",
          th: "นิมมานตื่นสายอย่างตั้งใจ ซึ่งเป็นเสน่ห์ของมัน เริ่มต้นที่ร้านคั่วกาแฟในซอย 1 ก่อน 9 โมงเช้า ตอนที่ร้านคอนเซ็ปต์ยังปิดม่านและซอยยังเป็นของจักรยานส่งของกับพ่อค้าแม่ค้าที่กำลังกวาดหน้าร้าน สั่งกาแฟดริปแบบ single origin แทนเมนูเอสเพรสโซ เพราะเมล็ดกาแฟภาคเหนือกำลังได้รับความนิยมอย่างแท้จริง และช่วงเวลาเงียบสงบนี้คือเวลาที่ดีที่สุดในการลิ้มรสมันจริงๆ",
        },
      },
      {
        heading: { en: "Midday: the numbered sois", th: "กลางวัน: ไล่ตามซอยที่มีเลขกำกับ" },
        body: {
          en: "By 11, walk the odd-numbered sois branching off the main road — independent jewellery makers, small ceramics studios, and secondhand bookshops with no sign out front. Nothing here rewards rushing; budget the whole afternoon to duck in and out of whatever catches your eye, and eat lunch wherever the queue looks local rather than curated for visitors.",
          th: "พอถึง 11 โมง เดินเล่นตามซอยเลขคี่ที่แยกจากถนนสายหลัก ร้านเครื่องประดับอิสระ สตูดิโอเซรามิกเล็กๆ และร้านหนังสือมือสองที่ไม่มีป้ายหน้าร้าน ที่นี่ไม่ตอบแทนความรีบร้อน เผื่อเวลาไว้ทั้งบ่ายเพื่อแวะเข้าออกตามสิ่งที่สะดุดตา และกินมื้อเที่ยงตรงที่คิวดูเป็นคนท้องถิ่นมากกว่าที่จัดไว้สำหรับนักท่องเที่ยว",
        },
      },
      {
        heading: { en: "Evening: rooftop, slowly", th: "ค่ำ: รูฟท็อป อย่างไม่รีบร้อน" },
        body: {
          en: "As the light drops, head up rather than out — Nimman's rooftop bars catch the mountain silhouette of Doi Suthep turning violet, and a single well-made cocktail here is worth more than three mediocre ones elsewhere. Save the district's livelier bars for a second night; the first evening is better spent watching the sky change.",
          th: "เมื่อแสงเริ่มลดลง ให้ขึ้นที่สูงแทนที่จะออกไปไกล เพราะรูฟท็อปบาร์ในนิมมานจะเห็นเงาดอยสุเทพเปลี่ยนเป็นสีม่วงยามเย็น ค็อกเทลดีๆ แก้วเดียวที่นี่คุ้มค่ากว่าแก้วธรรมดาสามแก้วที่อื่น เก็บบาร์ที่คึกคักกว่าของย่านนี้ไว้สำหรับคืนที่สอง เพราะเย็นแรกควรใช้ไปกับการนั่งดูท้องฟ้าเปลี่ยนสี",
        },
      },
      {
        heading: { en: "Day two: Ban Kang Wat detour", th: "วันที่สอง: แวะบ้านข้างวัด" },
        body: {
          en: "Rent a bicycle or grab a songthaew toward Wat Umong for the morning, and fold in Ban Kang Wat's small artisan community on the way back — an hour among its ceramics studios and bakery café is the right counterweight to Nimman's polish. Return to Nimman for a final coffee before your onward journey; you'll notice things you missed the first day.",
          th: "เช่าจักรยานหรือนั่งสองแถวไปทางวัดอุโมงค์ในช่วงเช้า แล้วแวะชุมชนหัตถกรรมเล็กๆ ที่บ้านข้างวัดระหว่างทางกลับ หนึ่งชั่วโมงท่ามกลางสตูดิโอเซรามิกและคาเฟ่เบเกอรี่ที่นี่คือความสมดุลที่ดีต่อความเงางามของนิมมาน กลับมานิมมานอีกครั้งเพื่อกาแฟแก้วสุดท้ายก่อนออกเดินทางต่อ คุณจะสังเกตเห็นสิ่งที่พลาดไปในวันแรก",
        },
      },
    ],
  },
  {
    slug: "cafe-hopping-route",
    title: { en: "The Café-Hopping Route", th: "เส้นทางคาเฟ่ฮอปปิ้ง" },
    dek: {
      en: "Three neighbourhoods, one thread of exceptional coffee, and the walk that connects them.",
      th: "สามย่าน หนึ่งเส้นด้ายของกาแฟชั้นเลิศ และเส้นทางเดินที่เชื่อมทั้งหมดเข้าด้วยกัน",
    },
    coverSeed: 6,
    readMinutes: 5,
    publishedAt: "2026-02-02",
    relatedPlaceSlugs: ["old-city-coffee-trail", "nimmanhaemin", "riverside-ping"],
    sections: [
      {
        heading: { en: "Why Chiang Mai, and not Bangkok", th: "ทำไมต้องเชียงใหม่ ไม่ใช่กรุงเทพฯ" },
        body: {
          en: "The best Thai coffee is grown within a few hours of this city — in Doi Chang, Mae Chan, and along the Burmese border ridgelines — which means the roasters here are working with beans days rather than weeks from harvest. That freshness shows up as a genuinely different cup, brighter and more floral than most travellers expect from Thai coffee.",
          th: "กาแฟไทยที่ดีที่สุดปลูกอยู่ห่างจากเมืองนี้เพียงไม่กี่ชั่วโมง ทั้งดอยช้าง แม่จัน และแนวสันเขาชายแดนพม่า นั่นหมายความว่าร้านคั่วในเมืองนี้ได้ทำงานกับเมล็ดกาแฟที่ผ่านการเก็บเกี่ยวมาเพียงไม่กี่วัน ไม่ใช่หลายสัปดาห์ ความสดใหม่นี้แสดงออกมาเป็นรสชาติที่แตกต่างอย่างแท้จริง สดใสและมีกลิ่นดอกไม้มากกว่าที่นักเดินทางส่วนใหญ่คาดหวังจากกาแฟไทย",
        },
      },
      {
        heading: { en: "Stop one: the old city, slowly", th: "จุดแรก: เมืองเก่า อย่างไม่รีบร้อน" },
        body: {
          en: "Begin inside the moat, where decorated roasters occupy shophouses barely wide enough for a bar. Order whatever the staff are personally excited about that week rather than a fixed menu item — the pour-over list changes with each new lot, and asking is part of the experience here.",
          th: "เริ่มต้นภายในคูเมือง ที่ร้านคั่วกาแฟรางวัลตั้งอยู่ในตึกแถวที่แคบพอๆ กับบาร์เอง สั่งสิ่งที่พนักงานตื่นเต้นเป็นการส่วนตัวในสัปดาห์นั้น มากกว่าเมนูตายตัว เพราะรายการดริปเปลี่ยนไปตามล็อตใหม่ทุกครั้ง และการถามคือส่วนหนึ่งของประสบการณ์ที่นี่",
        },
      },
      {
        heading: { en: "Stop two: Nimman's concept cafés", th: "จุดที่สอง: คาเฟ่คอนเซ็ปต์แห่งนิมมาน" },
        body: {
          en: "A short songthaew ride brings you to Nimman, where the same beans are often treated with more theatre — architectural interiors, single-serve brewing shows, dessert pairings built around the roast profile. It's a different kind of pleasure than the old city's quiet shopfronts, and worth experiencing back to back for the contrast.",
          th: "นั่งสองแถวไม่ไกลก็ถึงนิมมาน ที่เมล็ดกาแฟชนิดเดียวกันมักถูกนำเสนอด้วยลีลาที่มากกว่า ทั้งการตกแต่งภายในเชิงสถาปัตยกรรม การชงแบบโชว์ทีละแก้ว และของหวานที่จับคู่ตามโปรไฟล์การคั่ว เป็นความเพลิดเพลินคนละแบบกับหน้าร้านเงียบสงบในเมืองเก่า คุ้มค่าที่จะสัมผัสต่อกันเพื่อเทียบความแตกต่าง",
        },
      },
      {
        heading: { en: "Stop three: an evening coffee by the river", th: "จุดที่สาม: กาแฟยามเย็นริมแม่น้ำ" },
        body: {
          en: "Finish along Charoenrat Road as the light turns gold — several riverside restaurants pour excellent after-dinner coffee alongside their wine lists, and the Ping River view is the right final note to a day spent chasing cups across the city.",
          th: "จบทริปที่ถนนเจริญราษฎร์เมื่อแสงเริ่มเปลี่ยนเป็นสีทอง ร้านอาหารริมแม่น้ำหลายแห่งเสิร์ฟกาแฟหลังมื้อค่ำที่ยอดเยี่ยมควบคู่กับรายการไวน์ และวิวแม่น้ำปิงคือโน้ตสุดท้ายที่เหมาะสมสำหรับวันที่ใช้ไปกับการตามหากาแฟทั่วเมือง",
        },
      },
    ],
  },
  {
    slug: "temples-of-the-old-city",
    title: { en: "A Temple Trip Through the Old City", th: "ทริปวัดในเมืองเก่า" },
    dek: {
      en: "Four temples, one square kilometre, and the pace that lets each one actually land.",
      th: "สี่วัด หนึ่งตารางกิโลเมตร และจังหวะที่ทำให้แต่ละที่ประทับใจอย่างแท้จริง",
    },
    coverSeed: 2,
    readMinutes: 7,
    publishedAt: "2026-01-28",
    relatedPlaceSlugs: ["wat-chedi-luang", "wat-phra-singh", "wat-sri-suphan", "wua-lai-silver-village"],
    sections: [
      {
        heading: { en: "Why walk instead of tour", th: "ทำไมควรเดินแทนการนั่งทัวร์" },
        body: {
          en: "Chiang Mai's old city packs four of its finest temples inside walls you can circle on foot in under an hour, which makes a guided-tour van almost beside the point. Walking between them — past teak shophouses, tucked-away noodle stalls, and monks on their morning rounds — is as much the experience as the temples themselves.",
          th: "เมืองเก่าเชียงใหม่บรรจุวัดที่งดงามที่สุดสี่แห่งไว้ภายในกำแพงที่เดินรอบได้ในเวลาไม่ถึงชั่วโมง ทำให้รถทัวร์นำเที่ยวแทบไม่มีความจำเป็น การเดินระหว่างวัดแต่ละแห่ง ผ่านตึกแถวไม้สัก แผงก๋วยเตี๋ยวที่ซ่อนตัวอยู่ และพระสงฆ์ในกิจนิมนต์ยามเช้า ก็เป็นประสบการณ์ที่สำคัญไม่แพ้ตัววัดเอง",
        },
      },
      {
        heading: { en: "First: Wat Chedi Luang at opening", th: "แรก: วัดเจดีย์หลวงยามเปิด" },
        body: {
          en: "Arrive near 8 AM, before tour groups fill the ruined chedi's courtyard. The half-collapsed brick structure photographs best in flat morning light, and the temple's Monk Chat corner is usually staffed earlier than most visitors expect.",
          th: "มาถึงราว 8 โมงเช้า ก่อนกลุ่มทัวร์จะเข้ามาเต็มลานเจดีย์ที่พังทลาย โครงสร้างอิฐครึ่งซากถ่ายภาพสวยที่สุดในแสงเช้าที่นุ่มนวล และมุม Monk Chat ของวัดมักมีพระสงฆ์ประจำการเร็วกว่าที่นักท่องเที่ยวส่วนใหญ่คาดคิด",
        },
      },
      {
        heading: { en: "Then: Wat Phra Singh's quiet chapel", th: "ต่อมา: วิหารเงียบสงบแห่งวัดพระสิงห์" },
        body: {
          en: "A fifteen-minute walk west brings you to Wat Phra Singh; head straight for the smaller Lai Kham chapel beside the main hall, where 19th-century murals of everyday Lanna life reward a slow, close look rather than a quick photo from the doorway.",
          th: "เดินไปทางตะวันตกอีกสิบห้านาทีก็ถึงวัดพระสิงห์ มุ่งตรงไปที่วิหารลายคำหลังเล็กข้างอุโบสถหลัก ที่ซึ่งภาพจิตรกรรมวิถีชีวิตล้านนาในศตวรรษที่ 19 คุ้มค่ากับการมองอย่างใกล้ชิดและไม่รีบร้อน มากกว่าการถ่ายรูปเร็วๆ จากประตูทางเข้า",
        },
      },
      {
        heading: { en: "Last: Wat Sri Suphan at dusk", th: "สุดท้าย: วัดศรีสุพรรณยามพลบค่ำ" },
        body: {
          en: "Save the Silver Temple for late afternoon, then continue onto Wua Lai Road itself as the silversmith workshops wind down for the day — the light on the hammered panels is best right before the temple's floodlights take over from the sun.",
          th: "เก็บวัดศรีสุพรรณไว้สำหรับช่วงบ่ายแก่ๆ แล้วเดินต่อไปยังถนนวัวลายขณะที่เวิร์กช็อปช่างเงินกำลังจะปิดวันทำงาน แสงที่ตกกระทบแผ่นเงินตอกลายสวยที่สุดก่อนที่ไฟส่องวัดจะเข้ามาแทนที่แสงอาทิตย์เพียงเล็กน้อย",
        },
      },
    ],
  },
];

export function getGuideBySlug(slug: string) {
  return guides.find((g) => g.slug === slug);
}
