import type { Guide } from "./types";

export const guides: Guide[] = [
  {
    slug: "48-hours-in-nimman",
    title: { en: "48 Hours in Nimman", th: "48 ชั่วโมงในนิมมาน" },
    dek: {
      en: "A slow itinerary through Chiang Mai's design district — coffee, concept stores, and rooftop nights.",
      th: "สองวันแบบไม่รีบในย่านดีไซน์ของเชียงใหม่ กาแฟดีๆ ร้านเล็กที่มีแนวของตัวเอง แล้วปิดวันบนรูฟท็อป",
    },
    coverSeed: 4,
    readMinutes: 6,
    publishedAt: "2026-01-14",
    relatedPlaceSlugs: ["nimmanhaemin", "old-city-coffee-trail", "ban-kang-wat"],
    sections: [
      {
        heading: { en: "Morning: coffee before the crowds", th: "เช้า: กาแฟก่อนคนจะเยอะ" },
        body: {
          en: "Nimman wakes up slowly, which is exactly the point. Start at a soi 1 roaster before 9 AM, when the concept stores are still shuttered and the sois belong to bicycle deliveries and shopkeepers sweeping their thresholds. Order a single-origin filter rather than the espresso menu — Northern Thai beans are having a genuine moment, and the quieter hour is the best time to actually taste one.",
          th: "นิมมานเป็นย่านที่ตื่นสาย และนั่นแหละคือเสน่ห์ เริ่มที่ร้านคั่วกาแฟในซอย 1 ก่อนเก้าโมงเช้า ช่วงที่ร้านรวงยังไม่เปิด ในซอยมีแค่จักรยานส่งของกับเจ้าของร้านที่ออกมากวาดหน้าร้าน ลองสั่งกาแฟดริปแบบ single origin แทนเมนูเอสเพรสโซ เพราะเมล็ดกาแฟจากดอยทางเหนือกำลังมาแรง และตอนเช้าที่ร้านยังเงียบคือเวลาที่จะได้นั่งชิมรสกาแฟจริงๆ",
        },
      },
      {
        heading: { en: "Midday: the numbered sois", th: "กลางวัน: เดินไล่ไปทีละซอย" },
        body: {
          en: "By 11, walk the odd-numbered sois branching off the main road — independent jewellery makers, small ceramics studios, and secondhand bookshops with no sign out front. Nothing here rewards rushing; budget the whole afternoon to duck in and out of whatever catches your eye, and eat lunch wherever the queue looks local rather than curated for visitors.",
          th: "ราวสิบเอ็ดโมง ค่อยๆ เดินเข้าซอยเลขคี่ที่แยกจากถนนใหญ่ จะเจอร้านเครื่องประดับทำมือ สตูดิโอเซรามิกเล็กๆ และร้านหนังสือมือสองที่ไม่มีป้ายหน้าร้าน ย่านนี้ไม่เหมาะกับการรีบ เผื่อเวลาไว้ทั้งบ่าย เห็นร้านไหนน่าสนใจก็แวะ ส่วนมื้อเที่ยงให้เลือกร้านที่คนแถวนั้นต่อคิวกิน ไม่ใช่ร้านที่จัดไว้รับนักท่องเที่ยว",
        },
      },
      {
        heading: { en: "Evening: rooftop, slowly", th: "ค่ำ: ขึ้นรูฟท็อป แบบไม่ต้องรีบ" },
        body: {
          en: "As the light drops, head up rather than out — Nimman's rooftop bars catch the mountain silhouette of Doi Suthep turning violet, and a single well-made cocktail here is worth more than three mediocre ones elsewhere. Save the district's livelier bars for a second night; the first evening is better spent watching the sky change.",
          th: "พอแดดเริ่มอ่อน ไม่ต้องไปไหนไกล แค่ขึ้นที่สูง รูฟท็อปบาร์ในนิมมานมองเห็นเงาดอยสุเทพค่อยๆ เปลี่ยนเป็นสีม่วงตอนพลบค่ำ ค็อกเทลดีๆ แก้วเดียวตรงนี้คุ้มกว่าแก้วธรรมดาสามแก้วที่อื่น ส่วนบาร์ที่คึกคักกว่านี้เก็บไว้คืนที่สอง คืนแรกนั่งดูฟ้าเปลี่ยนสีก็พอแล้ว",
        },
      },
      {
        heading: { en: "Day two: Ban Kang Wat detour", th: "วันที่สอง: แวะบ้านข้างวัด" },
        body: {
          en: "Rent a bicycle or grab a songthaew toward Wat Umong for the morning, and fold in Ban Kang Wat's small artisan community on the way back — an hour among its ceramics studios and bakery café is the right counterweight to Nimman's polish. Return to Nimman for a final coffee before your onward journey; you'll notice things you missed the first day.",
          th: "ช่วงเช้าเช่าจักรยานหรือนั่งสองแถวไปทางวัดอุโมงค์ ขากลับแวะบ้านข้างวัด ชุมชนงานฝีมือเล็กๆ ใช้เวลาสักชั่วโมงเดินดูสตูดิโอเซรามิกกับคาเฟ่ขนมอบ ความเรียบง่ายที่นี่ช่วยถ่วงความเนี้ยบของนิมมานได้พอดี ก่อนเดินทางต่อ กลับมานิมมานดื่มกาแฟอีกแก้ว แล้วจะเห็นอะไรหลายอย่างที่วันแรกเดินผ่านไปโดยไม่ทันสังเกต",
        },
      },
    ],
  },
  {
    slug: "cafe-hopping-route",
    title: { en: "The Café-Hopping Route", th: "เส้นทางคาเฟ่ฮอปปิ้ง" },
    dek: {
      en: "Three neighbourhoods, one thread of exceptional coffee, and the route that connects them.",
      th: "สามย่านที่มีกาแฟดีเป็นตัวเชื่อม กับเส้นทางที่ไปต่อกันได้ในวันเดียว",
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
          th: "กาแฟไทยที่ดีที่สุดปลูกอยู่ห่างจากเชียงใหม่แค่ไม่กี่ชั่วโมง ทั้งดอยช้าง แม่จัน และแนวสันเขาชายแดนพม่า ร้านคั่วที่นี่จึงได้เมล็ดที่เพิ่งเก็บมาไม่กี่วัน ไม่ใช่หลายสัปดาห์ ความสดนี้ชิมแล้วรู้เลย รสสว่างและหอมกลิ่นดอกไม้กว่าที่คนส่วนใหญ่นึกถึงเมื่อพูดถึงกาแฟไทย",
        },
      },
      {
        heading: { en: "Stop one: the old city, slowly", th: "จุดแรก: เมืองเก่า ค่อยๆ ไป" },
        body: {
          en: "Begin inside the moat, where decorated roasters occupy shophouses barely wide enough for a bar. Order whatever the staff are personally excited about that week rather than a fixed menu item — the pour-over list changes with each new lot, and asking is part of the experience here.",
          th: "เริ่มในคูเมือง ร้านคั่วที่ได้รางวัลหลายร้านอยู่ในตึกแถวหน้าแคบ กว้างแทบไม่พอวางเคาน์เตอร์บาร์ อย่าสั่งตามเมนูประจำ ให้ถามบาริสต้าว่าสัปดาห์นี้ชอบตัวไหนเป็นพิเศษ รายการกาแฟดริปเปลี่ยนทุกครั้งที่มีเมล็ดล็อตใหม่เข้า และการได้ถามได้คุยก็คือส่วนหนึ่งของการมาร้านแบบนี้",
        },
      },
      {
        heading: { en: "Stop two: Nimman's concept cafés", th: "จุดที่สอง: คาเฟ่มีคอนเซ็ปต์ในนิมมาน" },
        body: {
          en: "A short songthaew ride brings you to Nimman, where the same beans are often treated with more theatre — architectural interiors, single-serve brewing shows, dessert pairings built around the roast profile. It's a different kind of pleasure than the old city's quiet shopfronts, and worth experiencing back to back for the contrast.",
          th: "นั่งสองแถวไม่นานก็ถึงนิมมาน ที่นี่เมล็ดกาแฟแบบเดียวกันมักถูกเสิร์ฟอย่างมีลีลากว่า ร้านตกแต่งเหมือนงานสถาปัตย์ ชงโชว์ให้ดูทีละแก้ว มีของหวานที่คิดมาให้เข้ากับระดับการคั่ว สนุกคนละแบบกับร้านเงียบๆ ในเมืองเก่า ลองไปสองที่ต่อกันจะเห็นความต่างชัด",
        },
      },
      {
        heading: { en: "Stop three: an evening coffee by the river", th: "จุดที่สาม: กาแฟยามเย็นริมแม่น้ำ" },
        body: {
          en: "Finish along Charoenrat Road as the light turns gold — several riverside restaurants pour excellent after-dinner coffee alongside their wine lists, and the Ping River view is the right final note to a day spent chasing cups across the city.",
          th: "ปิดท้ายที่ถนนเจริญราษฎร์ตอนแดดเริ่มเป็นสีทอง ร้านอาหารริมน้ำหลายร้านมีกาแฟหลังมื้อค่ำดีๆ อยู่ในเมนูคู่กับไวน์ และวิวแม่น้ำปิงก็เหมาะจะเป็นภาพสุดท้ายของวันที่ตระเวนชิมกาแฟมาทั้งเมือง",
        },
      },
    ],
  },
  {
    slug: "temples-of-the-old-city",
    title: { en: "A Temple Trip Through the Old City", th: "ทริปวัดในเมืองเก่า" },
    dek: {
      en: "Three temples and a silversmiths' street, all on foot, at the pace that lets each one actually land.",
      th: "สามวัดกับหนึ่งถนนช่างเงิน เดินถึงกันได้หมด ช้าพอที่จะได้ดูแต่ละที่จริงๆ",
    },
    coverSeed: 2,
    readMinutes: 7,
    publishedAt: "2026-01-28",
    relatedPlaceSlugs: ["wat-chedi-luang", "wat-phra-singh", "wat-sri-suphan", "wua-lai-silver-village"],
    sections: [
      {
        heading: { en: "Why walk instead of tour", th: "ทำไมควรเดิน ไม่ต้องพึ่งทัวร์" },
        body: {
          en: "Wat Chedi Luang and Wat Phra Singh sit inside the old city walls, and Wat Sri Suphan is a few minutes past the south moat. The old city is about a kilometre and a half across, twenty minutes on foot, which makes a guided-tour van almost beside the point. Walking between them — past teak shophouses, tucked-away noodle stalls, and monks on their morning rounds — is as much the experience as the temples themselves.",
          th: "วัดเจดีย์หลวงกับวัดพระสิงห์อยู่ในกำแพงเมืองเก่า ส่วนวัดศรีสุพรรณอยู่ถัดคูเมืองด้านใต้ไปไม่ถึงสามร้อยเมตร เมืองเก่ากว้างราวด้านละกิโลเมตรครึ่ง เดินข้ามได้ในราว 20 นาที รถตู้นำเที่ยวจึงแทบไม่จำเป็น ระหว่างเดินจากวัดหนึ่งไปอีกวัด จะผ่านตึกแถวไม้สัก ร้านก๋วยเตี๋ยวที่หลบอยู่ในซอย และพระที่ออกบิณฑบาตตอนเช้า ทั้งหมดนี้น่าจดจำพอๆ กับตัววัด",
        },
      },
      {
        heading: { en: "First: Wat Chedi Luang at opening", th: "เริ่มที่วัดเจดีย์หลวง ตอนวัดเพิ่งเปิด" },
        body: {
          en: "Arrive near 8 AM, before tour groups fill the ruined chedi's courtyard. The half-collapsed brick structure photographs best in flat morning light, and the temple's Monk Chat corner is usually staffed earlier than most visitors expect.",
          th: "ไปให้ถึงราวแปดโมงเช้า ก่อนกรุ๊ปทัวร์จะเต็มลานรอบเจดีย์ เจดีย์อิฐที่พังลงมาครึ่งองค์ถ่ายรูปสวยที่สุดในแสงเช้าที่ยังนุ่ม ส่วนมุม Monk Chat ของวัดมักมีพระมานั่งประจำเร็วกว่าที่หลายคนคิด",
        },
      },
      {
        heading: { en: "Then: Wat Phra Singh's quiet chapel", th: "ต่อด้วยวิหารหลังเล็กที่วัดพระสิงห์" },
        body: {
          en: "A ten-minute walk west brings you to Wat Phra Singh; head straight for the smaller Lai Kham chapel beside the main hall, where 19th-century murals of everyday Lanna life reward a slow, close look rather than a quick photo from the doorway.",
          th: "เดินไปทางตะวันตกราวสิบนาทีก็ถึงวัดพระสิงห์ ตรงไปที่วิหารลายคำหลังเล็กข้างอุโบสถหลักได้เลย ข้างในมีจิตรกรรมฝาผนังเล่าชีวิตประจำวันของคนล้านนา เขียนไว้ตั้งแต่คริสต์ศตวรรษที่ 19 ควรเข้าไปยืนดูใกล้ๆ อย่างไม่รีบ ดีกว่าถ่ายรูปจากหน้าประตูแล้วเดินผ่าน",
        },
      },
      {
        heading: { en: "Last: Wat Sri Suphan at dusk", th: "ปิดท้ายที่วัดศรีสุพรรณตอนพลบค่ำ" },
        body: {
          en: "Save the Silver Temple for late afternoon, then continue onto Wua Lai Road itself as the silversmith workshops wind down for the day — the light on the hammered panels is best right before the temple's floodlights take over from the sun.",
          th: "เก็บวัดศรีสุพรรณไว้ช่วงบ่ายแก่ๆ แล้วเดินต่อไปถนนวัวลายตอนที่ร้านช่างเงินเริ่มเก็บงานของวัน แสงบนแผ่นเงินดุนลายสวยที่สุดช่วงสั้นๆ ก่อนที่ไฟส่องวัดจะสว่างขึ้นมาแทนแสงอาทิตย์",
        },
      },
    ],
  },
];

export function getGuideBySlug(slug: string) {
  return guides.find((g) => g.slug === slug);
}
