/* ============================================================
   الوحدة 2 — نموذج OSI
   ============================================================ */
window.CURRICULUM = window.CURRICULUM || [];
window.CURRICULUM.push({
  unit: 2,
  title: "نموذج OSI",
  subtitle: "الطبقات السبع · PDU · Encapsulation",
  hours: 6,
  lessons: [
    {
      id: "2.1",
      title: "لماذا نحتاج نموذجًا؟",
      minutes: 10,
      goal: "تفهم الغاية من OSI قبل حفظ الطبقات.",
      theory: [
        "المشكلة: توصيل جهازين يحتاج طبقات كثيرة (كهرباء، إطار، عنوان، تطبيق...).",
        "**OSI (Open Systems Interconnection)** = نموذج مرجعي يقسّم الاتصال إلى **7 طبقات**، كل طبقة لها وظيفة محددة.",
        "**الفائدة 1:** تقسيم العمل — كل طبقة تخدم اللي فوقها ولا تتدخل في تفاصيلها.",
        "**الفائدة 2:** التوحيد — بائعون مختلفون يشتغلون مع بعض.",
        "**الفائدة 3:** التشخيص — تعرف في أي طبقة المشكل.",
        "OSI **نموذج نظري** (مرجعي) — التطبيق الحقيقي هو TCP/IP.",
        "⚠️ خطأ شائع: OSI ليست بروتوكولًا ولا برنامجًا."
      ],
      example: {
        given: "الإنترنت عندك يشتغل لكن موقع واحد لا يفتح.",
        steps: [
          "الطبقة 1-3 سليمة (عندك اتصال)",
          "المشكل في الأعلى: DNS أو التطبيق (طبقة 7)",
          "OSI تعطيك منهجية للبحث بدل التخمين"
        ],
        answer: "OSI = خريطة تشخيص"
      },
      drills: [
        { type: "mcq", q: "OSI هي؟", options: ["بروتوكول", "نموذج مرجعي بطبقات", "برنامج", "كابل"], answer: 1, explain: "OSI نموذج مرجعي نظري، ليست بروتوكولًا." },
        { type: "mcq", q: "كم طبقة في OSI؟", options: ["4", "5", "6", "7"], answer: 3, explain: "OSI = 7 طبقات." },
        { type: "mcq", q: "أهم فائدة عملية لنموذج الطبقات؟", options: ["زيادة السرعة", "تسهيل التشخيص والتقسيم", "تشفير البيانات", "تقليل السعر"], answer: 1, explain: "التشخيص والتقسيم هما القيمة الأساسية." },
        { type: "input", q: "اكتب اختصار النموذج المرجعي (بالإنجليزية)", answer: "OSI", accept: ["osi", "OSI"], explain: "Open Systems Interconnection." }
      ]
    },
    {
      id: "2.2",
      title: "الطبقات السبع ووظائفها",
      minutes: 20,
      goal: "تحفظ الطبقات السبع ووظيفة كل واحدة بالترتيب.",
      theory: [
        "**7. Application (تطبيق)** — واجهة المستخدم: HTTP، DNS، FTP، SMTP.",
        "**6. Presentation (تقديم)** — الترميز والضغط والتشفير: TLS/SSL، JPEG، UTF-8.",
        "**5. Session (جلسة)** — فتح/إدارة/إغلاق الجلسة بين طرفين.",
        "**4. Transport (نقل)** — تقسيم البيانات وإعادة ترتيبها: **TCP / UDP**، والمنافذ (ports).",
        "**3. Network (شبكة)** — العنوان المنطقي والتوجيه: **IP**، ICMP، الراوتر.",
        "**2. Data Link (ربط البيانات)** — الإطار والعنوان الفيزيائي: **Ethernet، MAC، Switch**.",
        "**1. Physical (فيزيائي)** — البتات والإشارات: كابل، ألياف، Wi-Fi waves.",
        "💡 جملة للحفظ (من 7 إلى 1): **A**ll **P**eople **S**eem **T**o **N**eed **D**ata **P**rocessing.",
        "💡 بالعربية: **تطبيق → تقديم → جلسة → نقل → شبكة → ربط → فيزيائي**."
      ],
      example: {
        given: "السؤال: في أي طبقة يعمل الراوتر؟ والـ Switch؟",
        steps: [
          "الراوتر يقرأ عناوين IP → الطبقة **3 Network**",
          "السويتش يقرأ MAC → الطبقة **2 Data Link**",
          "Hub/كابل → الطبقة **1 Physical**",
          "Firewall قد يعمل في 3 أو 4 أو 7 حسب النوع"
        ],
        answer: "Router = L3 · Switch = L2"
      },
      drills: [
        { type: "mcq", q: "TCP و UDP في أي طبقة؟", options: ["2", "3", "4", "7"], answer: 2, explain: "Transport = الطبقة 4." },
        { type: "mcq", q: "IP في أي طبقة؟", options: ["2", "3", "4", "5"], answer: 1, explain: "Network = الطبقة 3." },
        { type: "mcq", q: "MAC Address ينتمي لأي طبقة؟", options: ["1", "2", "3", "4"], answer: 1, explain: "Data Link = الطبقة 2." },
        { type: "mcq", q: "التشفير والضغط في أي طبقة؟", options: ["5", "6", "7", "4"], answer: 1, explain: "Presentation = الطبقة 6." },
        { type: "input", q: "اكتب اسم الطبقة رقم 5 بالإنجليزية", answer: "session", accept: ["session", "Session"], explain: "الطبقة 5 = Session (الجلسة)." }
      ]
    },
    {
      id: "2.3",
      title: "PDU — اسم البيانات في كل طبقة",
      minutes: 12,
      goal: "تعرف اسم الوحدة في كل طبقة، وهذا سؤال امتحاني مباشر.",
      theory: [
        "**PDU (Protocol Data Unit)** = اسم «حزمة البيانات» حسب الطبقة.",
        "الطبقة 7-5: **Data (بيانات)**",
        "الطبقة 4: **Segment (TCP)** أو **Datagram (UDP)**",
        "الطبقة 3: **Packet (حزمة)**",
        "الطبقة 2: **Frame (إطار)**",
        "الطبقة 1: **Bits (بتات)**",
        "💡 كل طبقة **تضيف Header** خاصها = عملية **Encapsulation**."
      ],
      example: {
        given: "بيانات HTTP تُرسل عبر TCP/IP/Ethernet. ما اسم الوحدة في كل مرحلة؟",
        steps: [
          "HTTP data → Data",
          "TCP يضيف header → Segment",
          "IP يضيف header → Packet",
          "Ethernet يضيف header/trailer → Frame",
          "الكابل يرسل → Bits"
        ],
        answer: "Data → Segment → Packet → Frame → Bits"
      },
      drills: [
        { type: "mcq", q: "اسم الوحدة في الطبقة 3؟", options: ["Frame", "Packet", "Segment", "Bits"], answer: 1, explain: "الطبقة 3 = Packet." },
        { type: "mcq", q: "اسم الوحدة في الطبقة 2؟", options: ["Packet", "Frame", "Segment", "Data"], answer: 1, explain: "الطبقة 2 = Frame." },
        { type: "mcq", q: "TCP يُنتج؟", options: ["Packet", "Frame", "Segment", "Bits"], answer: 2, explain: "TCP = Segment، UDP = Datagram." },
        { type: "input", q: "اسم الوحدة في الطبقة 1؟", answer: "bits", accept: ["bits", "bit", "Bits"], explain: "الطبقة 1 = Bits." }
      ]
    },
    {
      id: "2.4",
      title: "Encapsulation و Decapsulation",
      minutes: 15,
      goal: "تتبع رحلة البيانات من التطبيق إلى الكابل والعكس.",
      theory: [
        "**Encapsulation (التغليف)** = عند الإرسال: كل طبقة تضيف **header** (وبعضها trailer) وتنزل للطبقة اللي تحتها.",
        "**Decapsulation (فك التغليف)** = عند الاستقبال: كل طبقة تحذف header الخاصها وترفع الباقي للأعلى.",
        "**الترتيب عند الإرسال:** 7 → 6 → 5 → 4 → 3 → 2 → 1 (تنزل).",
        "**الترتيب عند الاستقبال:** 1 → 2 → 3 → 4 → 5 → 6 → 7 (تطلع).",
        "كل طبقة **تقرأ فقط header الخاصها** وتتجاهل الباقي — هذا سرّ الاستقلالية.",
        "**MTU** = أقصى حجم إطار؛ إذا البيانات أكبر → تُقسّم (Fragmentation في IP).",
        "⚠️ خطأ شائع: الطبقات لا تعمل بالتوازي، بل تمرر البيانات بالتسلسل."
      ],
      example: {
        given: "تفتح موقعًا في المتصفح. ارسم الرحلة.",
        steps: [
          "7: المتصفح يكوّن طلب HTTP",
          "4: TCP يقسّمه ويضيف منافذ (443)",
          "3: IP يضيف عناوين المصدر والهدف",
          "2: Ethernet يضيف MAC المصدر والهدف",
          "1: تحويل لبتات وإرسال",
          "في الخادم: العكس تمامًا"
        ],
        answer: "تغليف نازل → إرسال → فك تغليف صاعد"
      },
      drills: [
        { type: "mcq", q: "اتجاه Encapsulation؟", options: ["1→7", "7→1", "4→7", "عشوائي"], answer: 1, explain: "من التطبيق (7) نزولًا للفيزيائي (1)." },
        { type: "mcq", q: "ماذا تفعل الطبقة المستقبِلة بالـ header؟", options: ["تضيفه", "تحذفه", "تنسخه", "تشفّره"], answer: 1, explain: "Decapsulation = حذف header الطبقة." },
        { type: "mcq", q: "لماذا الطبقات مستقلة؟", options: ["لأنها سريعة", "لأن كل طبقة تقرأ header الخاصها فقط", "لأنها في نفس البرنامج", "لأن الكابل يقسّمها"], answer: 1, explain: "كل طبقة تتعامل مع جزء محدد فقط." },
        { type: "input", q: "اكتب المصطلح الإنجليزي لإضافة الـ header عند الإرسال", answer: "encapsulation", accept: ["encapsulation", "Encapsulation"], explain: "Encapsulation = تغليف البيانات بـ header في كل طبقة." },
        { type: "mcq", q: "ما هو MTU؟", options: ["سرعة الشبكة", "أقصى حجم إطار", "عدد الأجهزة", "نوع الكابل"], answer: 1, explain: "Maximum Transmission Unit — أقصى حجم payload للإطار." }
      ]
    },
    {
      id: "2.5",
      title: "أجهزة وبروتوكولات كل طبقة",
      minutes: 15,
      goal: "تربط النظرية بالواقع: من يعمل فين.",
      theory: [
        "**L1:** Hub، Repeater، Cable، Connector، AP (جزئيًا).",
        "**L2:** Switch، Bridge، NIC، **MAC**، ARP (جسر بين 2 و3)، VLAN، STP.",
        "**L3:** **Router**، **IP**، ICMP، ARP (جزئيًا)، Routing protocols (OSPF/BGP).",
        "**L4:** **TCP/UDP**، المنافذ، Firewall (stateful)، Load Balancer.",
        "**L5:** Sessions، RPC، NetBIOS.",
        "**L6:** TLS/SSL، JPEG، MPEG، ASCII/UTF-8.",
        "**L7:** HTTP/HTTPS، DNS، FTP، SMTP، SSH، DHCP، SNMP.",
        "⚠️ بعض البروتوكولات تمتد على طبقات (ARP، TLS) — الامتحان يعتمد التصنيف الشائع."
      ],
      example: {
        given: "صنّف: DNS · Switch · IP · TCP · TLS · Cable",
        steps: [
          "DNS → L7",
          "Switch → L2",
          "IP → L3",
          "TCP → L4",
          "TLS → L6 (يُقال أيضًا L5/L7 عمليًا)",
          "Cable → L1"
        ],
        answer: "7 · 2 · 3 · 4 · 6 · 1"
      },
      drills: [
        { type: "mcq", q: "DNS في أي طبقة؟", options: ["4", "5", "6", "7"], answer: 3, explain: "DNS تطبيق = L7." },
        { type: "mcq", q: "TLS/SSL في أي طبقة (التصنيف الشائع)؟", options: ["1", "3", "6", "4"], answer: 2, explain: "Presentation = L6." },
        { type: "mcq", q: "ARP يربط بين؟", options: ["IP و MAC", "TCP و UDP", "DNS و IP", "HTTP و HTTPS"], answer: 0, explain: "ARP يحوّل IP إلى MAC." },
        { type: "input", q: "في أي طبقة من OSI يعمل السويتش؟ (اكتب الرقم)", answer: "2", accept: ["2", "layer 2", "L2"], explain: "Switch يعمل في الطبقة 2 لأنه يتعامل مع MAC." },
        { type: "mcq", q: "STP (Spanning Tree) في أي طبقة؟", options: ["1", "2", "3", "4"], answer: 1, explain: "STP بروتوكول تبديل = L2." }
      ]
    },
    {
      id: "2.6",
      title: "التشخيص بالطبقات",
      minutes: 12,
      goal: "تستعمل OSI كمنهجية عملية لحل المشاكل.",
      theory: [
        "**Bottom-up:** ابدأ من L1 (كابل/لمبة) واصعد. مفيد للمشاكل الفيزيائية.",
        "**Top-down:** ابدأ من التطبيق (المتصفح) وانزل. مفيد عندما التطبيق فقط لا يعمل.",
        "**Divide and conquer:** اختبر طبقة وسطى (ping) وحدد الاتجاه.",
        "**أداة كل طبقة:** L1 كابل/لمبة · L2 `display mac-address` · L3 `ping`/`tracert` · L4 `netstat` · L7 المتصفح/DNS.",
        "مثال: `ping 8.8.8.8` ينجح لكن `ping google.com` يفشل → المشكل **DNS (L7)**.",
        "مثال: `ping` للبوابة يفشل → المشكل في L1/L2/L3 المحلي.",
        "⚠️ لا تبدأ بتغيير الإعدادات قبل تحديد الطبقة."
      ],
      example: {
        given: "الجهاز متصل بالواي فاي لكن لا يفتح أي موقع.",
        steps: [
          "L1: الواي فاي متصل ✅",
          "L3: `ipconfig` → هل عندي IP؟ إذا 169.254 → مشكل DHCP",
          "L3: `ping 8.8.8.8` → إذا فشل: بوابة/توجيه",
          "L7: إذا نجح ping بـ IP وفشل بالاسم → DNS"
        ],
        answer: "منهجية: L1 → L3 → L7"
      },
      drills: [
        { type: "mcq", q: "ping بالـ IP ينجح وبالاسم يفشل. المشكل؟", options: ["الكابل", "DNS", "الراوتر", "كرت الشبكة"], answer: 1, explain: "تحويل الأسماء = DNS." },
        { type: "mcq", q: "أي أداة تختبر الطبقة 3؟", options: ["ping", "netstat", "المتصفح", "display mac-address"], answer: 0, explain: "ping يستعمل ICMP على L3." },
        { type: "mcq", q: "الجهاز أخذ 169.254.x.x. المشكلة؟", options: ["DNS", "DHCP", "الكابل", "الفايروول"], answer: 1, explain: "APIPA يعني لم يصل رد من DHCP." },
        { type: "input", q: "ما الأمر الذي يختبر الاتصال في الطبقة 3؟", answer: "ping", accept: ["ping", "PING"], explain: "ping يستعمل ICMP على الطبقة 3." },
        { type: "mcq", q: "Bottom-up يعني؟", options: ["من 7 إلى 1", "من 1 إلى 7", "من 4", "بلا ترتيب"], answer: 1, explain: "نبدأ من الفيزيائي ونصعد." }
      ]
    }
  ]
});
