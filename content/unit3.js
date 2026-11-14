/* ============================================================
   الوحدة 3 — نموذج TCP/IP
   ============================================================ */
window.CURRICULUM = window.CURRICULUM || [];
window.CURRICULUM.push({
  unit: 3,
  title: "نموذج TCP/IP",
  subtitle: "4 طبقات · المقابلة مع OSI · الرحلة",
  hours: 3,
  lessons: [
    {
      id: "3.1",
      title: "الطبقات الأربع",
      minutes: 15,
      goal: "تعرف طبقات TCP/IP الأربع ووظيفة كل واحدة.",
      theory: [
        "**TCP/IP** هو النموذج **العملي** اللي يشتغل به الإنترنت فعليًا (OSI مرجعي فقط).",
        "**4. Application** = تجمع طبقات OSI 5-6-7: HTTP، DNS، FTP، SSH، TLS.",
        "**3. Transport** = TCP/UDP + المنافذ، تضمن النقل من طرف لطرف.",
        "**2. Internet** = **IP** + ICMP + ARP، والتوجيه بين الشبكات.",
        "**1. Network Access (Link)** = Ethernet، MAC، الكابل، Wi-Fi (يجمع OSI 1-2).",
        "أسماء بديلة: بعض الكتب تسميها 5 طبقات (تفصل Physical عن Data Link) — المفهوم نفسه.",
        "⚠️ خطأ شائع: TCP/IP ليس بروتوكولين فقط، بل **مجموعة** بروتوكولات."
      ],
      example: {
        given: "أين تجد TCP في TCP/IP؟ وأين IP؟",
        steps: [
          "TCP → طبقة **Transport (3)**",
          "IP → طبقة **Internet (2)**",
          "HTTP → **Application (4)**",
          "Ethernet → **Network Access (1)**"
        ],
        answer: "TCP=L3 (في TCP/IP) · IP=L2"
      },
      drills: [
        { type: "mcq", q: "كم طبقة في نموذج TCP/IP؟", options: ["3", "4", "5", "7"], answer: 1, explain: "أربع طبقات." },
        { type: "mcq", q: "IP في أي طبقة من TCP/IP؟", options: ["Application", "Transport", "Internet", "Network Access"], answer: 2, explain: "Internet layer." },
        { type: "mcq", q: "Ethernet في أي طبقة؟", options: ["Internet", "Transport", "Network Access", "Application"], answer: 2, explain: "Network Access (Link)." },
        { type: "mcq", q: "HTTP و DNS في أي طبقة؟", options: ["Application", "Transport", "Internet", "Link"], answer: 0, explain: "Application layer." },
        { type: "input", q: "كم طبقة في TCP/IP؟ (رقم)", answer: "4", accept: ["4"], explain: "أربع طبقات." },
        { type: "input", q: "أي طبقة TCP/IP فيها IP؟ (بالإنجليزية)", answer: "internet", accept: ["internet", "Internet"], explain: "Internet layer." }
      ]
    },
    {
      id: "3.2",
      title: "المقابلة بين OSI و TCP/IP",
      minutes: 12,
      goal: "تربط كل طبقة OSI بمقابلها فورًا — سؤال امتحاني دائم.",
      theory: [
        "**OSI 7 + 6 + 5** → **TCP/IP Application**",
        "**OSI 4** → **TCP/IP Transport**",
        "**OSI 3** → **TCP/IP Internet**",
        "**OSI 2 + 1** → **TCP/IP Network Access**",
        "طبقات OSI العليا اندمجت لأنها في البرامج، مو في الشبكة.",
        "**PDU:** Data → Segment → Packet → Frame → Bits (نفسها في النموذجين).",
        "💡 قاعدة: OSI = 7 خانات للتفصيل، TCP/IP = 4 خانات للتطبيق."
      ],
      example: {
        given: "طبقة Session في OSI تقابل ماذا في TCP/IP؟",
        steps: [
          "Session = OSI 5",
          "OSI 5-6-7 كلها داخل Application",
          "إذن Session → Application",
          "لكن عمليًا إدارة الجلسة يقوم بها التطبيق أو TLS"
        ],
        answer: "Application"
      },
      drills: [
        { type: "mcq", q: "OSI طبقة 4 تقابل؟", options: ["Application", "Transport", "Internet", "Link"], answer: 1, explain: "Transport = Transport." },
        { type: "mcq", q: "OSI طبقة 2 تقابل؟", options: ["Application", "Transport", "Internet", "Network Access"], answer: 3, explain: "Data Link داخل Network Access." },
        { type: "mcq", q: "OSI طبقة 3 تقابل؟", options: ["Internet", "Transport", "Application", "Link"], answer: 0, explain: "Network = Internet." },
        { type: "mcq", q: "كم طبقة OSI دخلت في Application؟", options: ["1", "2", "3", "4"], answer: 2, explain: "5 و6 و7 = ثلاث طبقات." },
        { type: "input", q: "OSI طبقة 3 تقابل أي طبقة في TCP/IP؟", answer: "internet", accept: ["internet", "Internet"], explain: "Network = Internet." },
        { type: "input", q: "OSI طبقة 2 تقابل أي طبقة في TCP/IP؟", answer: "network access", accept: ["network access", "Network Access", "link", "Link"], explain: "Data Link داخل Network Access." }
      ]
    },
    {
      id: "3.3",
      title: "رحلة البيانات في TCP/IP",
      minutes: 15,
      goal: "تطبق Encapsulation على النموذج العملي.",
      theory: [
        "**الإرسال (نزول):** Application → Transport (TCP يضيف منافذ) → Internet (IP يضيف عناوين) → Link (Ethernet يضيف MAC) → بتات.",
        "**الاستقبال (صعود):** Link → Internet → Transport → Application.",
        "كل طبقة تضيف **Header**: TCP header، IP header، Ethernet header + FCS trailer.",
        "**الراوتر** يفك فقط حتى L3، ثم يعيد التغليف في L2 جديد لكل قفزة (Hop).",
        "**السويتش** يفك/يعيد L2 فقط، ولا يلمس IP.",
        "لهذا MAC يتغير في كل قفزة، و**IP يبقى ثابتًا** من المصدر للهدف.",
        "⚠️ خطأ كبير: الاعتقاد أن MAC المصدر يبقى ثابتًا إلى النهاية."
      ],
      example: {
        given: "PC → Router → Server. ماذا يتغير؟",
        steps: [
          "PC يرسل Frame: MAC المصدر = PC، MAC الهدف = الراوتر",
          "الراوتر يفك L2، يقرأ IP الهدف، يقرر الطريق",
          "يعيد التغليف: MAC المصدر = الراوتر، الهدف = التالي",
          "IP المصدر والهدف **لم يتغيرا**"
        ],
        answer: "MAC يتغير · IP ثابت"
      },
      drills: [
        { type: "mcq", q: "ماذا يبقى ثابتًا من المصدر للهدف؟", options: ["MAC", "IP", "Frame", "FCS"], answer: 1, explain: "IP منطقي من طرف لطرف." },
        { type: "mcq", q: "الراوتر يفك التغليف حتى؟", options: ["L1", "L2", "L3", "L7"], answer: 2, explain: "يحتاج IP header → L3." },
        { type: "mcq", q: "من يضيف المنافذ (ports)؟", options: ["IP", "TCP/UDP", "Ethernet", "الكابل"], answer: 1, explain: "Transport layer." },
        { type: "mcq", q: "ما اسم البيانات بعد Ethernet؟", options: ["Segment", "Packet", "Frame", "Bits"], answer: 2, explain: "Ethernet = Frame." },
        { type: "input", q: "ما الذي يتغير في كل قفزة: IP أم MAC؟", answer: "mac", accept: ["mac", "MAC"], explain: "MAC يُعاد تغليفه في كل قفزة، IP ثابت." },
        { type: "input", q: "أي طبقة تضيف المنافذ (ports)؟ (بالإنجليزية)", answer: "transport", accept: ["transport", "Transport"], explain: "TCP/UDP = Transport." }
      ]
    },
    {
      id: "3.4",
      title: "لماذا نموذجان؟",
      minutes: 10,
      goal: "تفهم الفرق العملي وتجاوب بثقة.",
      theory: [
        "**OSI** = نموذج مرجعي تعليمي، دقيق في التقسيم، لكن لا يطابقه أي نظام حقيقي 100%.",
        "**TCP/IP** = مبني من بروتوكولات حقيقية شغّالة منذ السبعينات، وهو أساس الإنترنت.",
        "OSI يفصل **Presentation/Session**، TCP/IP يدمجهما في التطبيق.",
        "OSI يُستعمل في **التعليم والتشخيص**، TCP/IP في **التنفيذ**.",
        "في الامتحانات: تُسأل عن الاثنين، فاحفظ المقابلة.",
        "💡 جملة: «OSI تشرح، TCP/IP تعمل»."
      ],
      example: {
        given: "لماذا لا يوجد بروتوكول اسمه «OSI»؟",
        steps: [
          "OSI نموذج وصفي، ليس تنفيذًا",
          "التنفيذ الحقيقي: TCP/IP stack في نظام التشغيل",
          "لهذا نقول «نموذج OSI» و«حزمة TCP/IP»"
        ],
        answer: "OSI = وصف · TCP/IP = تنفيذ"
      },
      drills: [
        { type: "mcq", q: "أي نموذج يُستعمل فعليًا في الإنترنت؟", options: ["OSI", "TCP/IP", "ISO", "IEEE"], answer: 1, explain: "TCP/IP هو التنفيذ الحقيقي." },
        { type: "mcq", q: "OSI تُستعمل أساسًا في؟", options: ["التنفيذ", "التعليم والتشخيص", "التشفير", "الكابلات"], answer: 1, explain: "مرجع تعليمي وتشخيصي." },
        { type: "mcq", q: "Presentation و Session في TCP/IP؟", options: ["طبقتان مستقلتان", "داخل Application", "داخل Transport", "محذوفتان"], answer: 1, explain: "مدمجتان في Application." },
        { type: "input", q: "أي نموذج يُنفَّذ فعليًا على الإنترنت؟ (اكتب TCP/IP)", answer: "tcp/ip", accept: ["tcp/ip", "TCP/IP"], explain: "TCP/IP هو التنفيذ الحقيقي." },
        { type: "input", q: "هل OSI نموذج أم بروتوكول؟ (نموذج/بروتوكول)", answer: "نموذج", accept: ["نموذج", "model"], explain: "OSI نموذج مرجعي." }
      ]
    }
  ]
});
