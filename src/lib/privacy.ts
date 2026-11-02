// Privacy policy and cookie notice (/maxfiylik), written against the Law of Uzbekistan "On Personal Data"
// (ZRU-547 of 02.07.2019 as amended by ZRU-1125 of 26.03.2026). Keep it true to what the code does:
// a new field, cookie, service or AI provider means a new line here and a new UPDATED date.
import type { Locale } from "@/i18n/config";
import { CONTACTS, SITE_URL } from "./site";
const UPDATED = { uz: "2026-yil 2-noyabr", ru: "2 ноября 2026 г." };

export type PolicyBlock = { title: string; text?: string[]; list?: string[]; table?: { head: string[]; rows: string[][] } };
export type Policy = { title: string; updated: string; intro: string; blocks: PolicyBlock[] };

const site = SITE_URL.replace(/^https?:\/\//, "");
const admin = `@${CONTACTS.telegram}`;

const uz: Policy = {
  title: "Maxfiylik siyosati",
  updated: `Kuchga kirgan sana: ${UPDATED.uz}`,
  intro:
    `Ushbu siyosat codov o‘quv platformasi (${site}) va Telegram-bot @Codov_uz_bot qanday shaxsga doir ma’lumotlarni ` +
    "to‘plashi, nima uchun ishlatishi, qayerda saqlashi va siz qanday huquqlarga ega ekaningizni tushuntiradi. " +
    "Biz O‘zbekiston Respublikasining «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonuniga (O‘RQ-547) amal qilamiz.",
  blocks: [
    {
      title: "1. Qanday ma’lumotlarni to‘playmiz",
      list: [
        "Ro‘yxatdan o‘tishda: ism, familiya (ixtiyoriy), telefon raqami, tanlangan kurs va parol. Parol ochiq holda saqlanmaydi — faqat qaytarib bo‘lmaydigan xesh ko‘rinishida.",
        "O‘qish jarayonida: darslar bo‘yicha natijalar, topshiriqlar kodi va qoralamalari, baholar va o‘qituvchi izohlari, davomat, guruh chatidagi xabarlar, bildirishnomalar, til va ko‘rinish sozlamalari, oxirgi kirish vaqti.",
        "Ota-ona akkaunti: qaysi farzand bilan bog‘langani — farzandning natijalarini ko‘rsatish uchun.",
        "Telegram-botda: Telegram ID, username va ism (Telegram o‘zi beradigan), qaysi video yoki havola orqali kelganingiz, botga necha marta kirganingiz va sovg‘a yuborilgani. Kanalga obunani faqat «obuna bo‘lgan / bo‘lmagan» ko‘rinishida tekshiramiz.",
        "Texnik ma’lumotlar: IP-manzil — ro‘yxatdan o‘tishda ko‘p urinishlardan himoya uchun bir necha daqiqa server xotirasida turadi, bazaga yozilmaydi; hosting provayderi esa xavfsizlik uchun so‘rovlar jurnalini qisqa muddat saqlaydi.",
      ],
    },
    {
      title: "2. Nimalarni to‘plamaymiz",
      list: [
        "Pasport va boshqa hujjatlar ma’lumotlari, bank kartasi raqamlari, biometrik va genetik ma’lumotlar, geolokatsiya.",
        "Saytda reklama, tahliliy kuzatuv tizimlari va piksellar yo‘q (Google Analytics, Yandex Metrika, Facebook Pixel va shu kabilar ishlatilmaydi).",
        "Ma’lumotlaringizni sotmaymiz va reklama uchun boshqalarga bermaymiz.",
      ],
    },
    {
      title: "3. Ma’lumotlar nima uchun kerak",
      list: [
        "Akkaunt yaratish va tizimga kirish (telefon raqami — login).",
        "O‘qitish: darslarni ochish, topshiriqlarni avtomatik va o‘qituvchi tomonidan tekshirish, baholash, guruh ishini tashkil etish.",
        "Aloqa: o‘qituvchi kurs bo‘yicha qo‘ng‘iroq qilishi yoki Telegramda yozishi mumkin.",
        "Ota-onaga farzandining natijalarini ko‘rsatish.",
        "Telegram-bot orqali va’da qilingan bepul materiallarni yuborish va qaysi video foydali bo‘lganini bilish.",
        "Platforma xavfsizligi va suiiste’mollardan himoya.",
      ],
    },
    {
      title: "4. Rozilik va voyaga yetmaganlar",
      text: [
        "Ro‘yxatdan o‘tish shaklida belgi qo‘yib, siz ushbu siyosatga muvofiq ma’lumotlaringizni qayta ishlashga rozilik berasiz. Telegram-botda «Start» tugmasini bosish bot uchun ma’lumotlarni (1-bo‘limda) qayta ishlashga rozilik hisoblanadi.",
        "Agar siz 18 yoshga to‘lmagan bo‘lsangiz, ro‘yxatdan o‘tishdan oldin ota-onangiz yoki qonuniy vakilingiz roziligini oling. O‘qituvchi yaratgan o‘quvchi akkauntlari ota-ona bilan kelishilgan holda ochiladi.",
        "Roziligingizni istalgan vaqtda qaytarib olishingiz mumkin (8-bo‘lim).",
      ],
    },
    {
      title: "5. Kimlar ma’lumotlarga kira oladi",
      text: [
        "Ma’lumotlaringizni faqat sizning o‘qituvchingiz va platforma administratori ko‘radi; ota-ona — faqat o‘z farzandiniki. Platforma ishlashi uchun quyidagi xizmatlardan foydalanamiz:",
      ],
      list: [
        "Vercel Inc. — sayt hostingi va yuklangan fayllar ombori. Sayt serverlari Frankfurtda (Germaniya).",
        "Neon — ma’lumotlar bazasi, Amazon Web Services serverlarida, Frankfurt (Germaniya).",
        "Google (Gemini API) — topshiriq kodining sun’iy intellekt tahlili uchun. Unga faqat topshiriq matni va kod yuboriladi; ism, telefon va boshqa shaxsiy ma’lumotlar yuborilmaydi.",
        "Telegram — bot orqali muloqot va kanalga obunani tekshirish.",
        "YouTube (Google) — video darslar youtube-nocookie.com orqali ko‘rsatiladi; videoni ishga tushirsangiz, Google o‘z qoidalariga ko‘ra cookie o‘rnatishi mumkin.",
        "Davlat organlari — faqat qonunda belgilangan hollarda va tartibda.",
      ],
    },
    {
      title: "6. Ma’lumotlar qayerda saqlanadi",
      text: [
        "Ma’lumotlar Yevropa Ittifoqidagi (Germaniya) serverlarda saqlanadi. Biometrik, genetik va telekommunikatsiya operatorlari foydalanuvchilariga oid ma’lumotlarni qayta ishlamaymiz — qonunga ko‘ra faqat shular O‘zbekistonda saqlanishi shart (O‘RQ-547, 27¹-modda, 2026-yil 26-martdagi O‘RQ-1125 tahririda).",
        "Boshqa ma’lumotlarni chet elda saqlashda biz xalqaro axborot xavfsizligi standartlari (ISO/IEC 27001, SOC 2) bo‘yicha sertifikatlangan provayderlardan foydalanamiz.",
      ],
    },
    {
      title: "7. Qancha muddat saqlaymiz",
      list: [
        "Akkaunt ma’lumotlari va o‘quv ishlari — akkaunt faol bo‘lgan davrda.",
        "O‘chirishni so‘rasangiz — 30 kun ichida o‘chiramiz yoki shaxsingizni aniqlab bo‘lmaydigan holga keltiramiz, qonun saqlashni talab qiladigan ma’lumotlar bundan mustasno.",
        "Telegram-bot ma’lumotlari — so‘rovingizga qadar.",
      ],
    },
    {
      title: "8. Sizning huquqlaringiz",
      list: [
        "Qanday ma’lumotlaringiz saqlanayotganini bilish va nusxasini olish.",
        "Noto‘g‘ri ma’lumotni tuzatish (ism va telefonni o‘qituvchi o‘zgartiradi).",
        "Ma’lumotlarni o‘chirish va roziligingizni qaytarib olish.",
        "Huquqingiz buzilgan deb hisoblasangiz — vakolatli davlat organiga yoki sudga murojaat qilish.",
        `So‘rov uchun Telegramda yozing: ${admin}. Javob muddati — 30 kungacha. Botdan chiqish uchun uni bloklash kifoya; ma’lumotlarni o‘chirishni esa ${admin} orqali so‘rang.`,
      ],
    },
    {
      title: "9. Xavfsizlik",
      list: [
        "Sayt faqat shifrlangan HTTPS ulanishi orqali ishlaydi.",
        "Parollar xesh ko‘rinishida saqlanadi — ularni hatto administrator ham ko‘ra olmaydi.",
        "Har bir foydalanuvchi faqat o‘z roliga ruxsat etilgan ma’lumotlarni ko‘radi.",
        "Kod tekshiruvi brauzerdagi izolyatsiya qilingan oynada bajariladi.",
      ],
    },
    {
      title: "10. Cookie fayllar",
      text: [
        "Cookie — sayt brauzeringizda saqlaydigan kichik fayl. Biz faqat sayt ishlashi uchun zarur cookie’lardan foydalanamiz; reklama va kuzatuv cookie’lari yo‘q. Shuning uchun ular uchun alohida rozilik so‘ralmaydi. Brauzer sozlamalarida ularni o‘chirishingiz mumkin, lekin unda tizimga kirib bo‘lmaydi.",
      ],
      table: {
        head: ["Nomi", "Nima uchun", "Muddati"],
        rows: [
          ["cubick_session", "Tizimga kirganingizni eslab qolish (shifrlangan imzo, faqat server o‘qiydi)", "«Shu qurilmada eslab qolish» belgisi bilan 180 kun, aks holda brauzer yopilguncha"],
          ["cubick_locale", "Tanlangan til (o‘zbek / rus)", "1 yil"],
          ["cubick_theme", "Yorug‘ yoki qorong‘i ko‘rinish", "1 yil"],
          ["codov_cookies", "Cookie haqidagi xabarni yopganingiz", "1 yil"],
        ],
      },
    },
    {
      title: "11. O‘zgarishlar va aloqa",
      text: [
        "Siyosat o‘zgarsa, yangi tahrir shu sahifada sana bilan e’lon qilinadi. Muhim o‘zgarishlar haqida platformada xabar beramiz.",
        `Savollar uchun: Telegram ${admin}, sayt ${site}.`,
      ],
    },
  ],
};

const ru: Policy = {
  title: "Политика конфиденциальности",
  updated: `Действует с ${UPDATED.ru}`,
  intro:
    `Эта политика объясняет, какие персональные данные собирают учебная платформа codov (${site}) и Telegram-бот @Codov_uz_bot, ` +
    "зачем они нужны, где хранятся и какие у вас есть права. Мы соблюдаем Закон Республики Узбекистан «О персональных данных» (ЗРУ-547).",
  blocks: [
    {
      title: "1. Какие данные мы собираем",
      list: [
        "При регистрации: имя, фамилия (необязательно), номер телефона, выбранный курс и пароль. Пароль не хранится в открытом виде — только как необратимый хеш.",
        "Во время учёбы: прогресс по урокам, код заданий и черновики, оценки и комментарии преподавателя, посещаемость, сообщения в чате группы, уведомления, настройки языка и оформления, время последнего входа.",
        "Аккаунт родителя: с каким ребёнком он связан — чтобы показывать результаты ребёнка.",
        "В Telegram-боте: Telegram ID, username и имя (их передаёт сам Telegram), по какому видео или ссылке вы пришли, сколько раз открывали бота и был ли отправлен подарок. Подписку на канал проверяем только как «подписан / не подписан».",
        "Технические данные: IP-адрес — при регистрации несколько минут хранится в памяти сервера для защиты от массовых попыток и не записывается в базу; хостинг-провайдер недолго хранит журнал запросов для безопасности.",
      ],
    },
    {
      title: "2. Что мы не собираем",
      list: [
        "Паспортные и другие документы, номера банковских карт, биометрические и генетические данные, геолокацию.",
        "На сайте нет рекламы, систем аналитики и пикселей (Google Analytics, Яндекс Метрика, Facebook Pixel и подобные не используются).",
        "Мы не продаём ваши данные и не передаём их для рекламы.",
      ],
    },
    {
      title: "3. Зачем нужны данные",
      list: [
        "Создание аккаунта и вход (номер телефона — это логин).",
        "Обучение: открытие уроков, автоматическая проверка и проверка преподавателем, оценки, работа группы.",
        "Связь: преподаватель может позвонить или написать в Telegram по поводу курса.",
        "Показ родителю результатов ребёнка.",
        "Отправка обещанных бесплатных материалов через Telegram-бот и понимание, какое видео оказалось полезным.",
        "Безопасность платформы и защита от злоупотреблений.",
      ],
    },
    {
      title: "4. Согласие и несовершеннолетние",
      text: [
        "Отмечая галочку в форме регистрации, вы даёте согласие на обработку данных по этой политике. Нажатие «Start» в Telegram-боте — согласие на обработку данных бота (раздел 1).",
        "Если вам нет 18 лет, перед регистрацией получите согласие родителей или законного представителя. Аккаунты учеников, которые создаёт преподаватель, открываются по договорённости с родителями.",
        "Согласие можно отозвать в любой момент (раздел 8).",
      ],
    },
    {
      title: "5. Кто имеет доступ к данным",
      text: ["Ваши данные видят только ваш преподаватель и администратор платформы, родитель — только данные своего ребёнка. Для работы платформы мы используем сервисы:"],
      list: [
        "Vercel Inc. — хостинг сайта и хранилище загруженных файлов. Серверы сайта — во Франкфурте (Германия).",
        "Neon — база данных на серверах Amazon Web Services, Франкфурт (Германия).",
        "Google (Gemini API) — разбор кода заданий искусственным интеллектом. Передаются только текст задания и код; имя, телефон и другие личные данные не передаются.",
        "Telegram — общение через бот и проверка подписки на канал.",
        "YouTube (Google) — видеоуроки показываются через youtube-nocookie.com; если вы запустите видео, Google может установить cookie по своим правилам.",
        "Государственные органы — только в случаях и порядке, предусмотренных законом.",
      ],
    },
    {
      title: "6. Где хранятся данные",
      text: [
        "Данные хранятся на серверах в Европейском союзе (Германия). Мы не обрабатываем биометрические, генетические данные и данные абонентов операторов связи — по закону только они должны храниться в Узбекистане (ЗРУ-547, статья 27¹ в редакции ЗРУ-1125 от 26 марта 2026 г.).",
        "Для хранения остальных данных за рубежом мы используем провайдеров, сертифицированных по международным стандартам информационной безопасности (ISO/IEC 27001, SOC 2).",
      ],
    },
    {
      title: "7. Сколько мы храним данные",
      list: [
        "Данные аккаунта и учебные работы — пока аккаунт активен.",
        "По вашему запросу на удаление — удаляем или обезличиваем в течение 30 дней, кроме данных, которые закон обязывает хранить.",
        "Данные Telegram-бота — до вашего запроса.",
      ],
    },
    {
      title: "8. Ваши права",
      list: [
        "Узнать, какие ваши данные хранятся, и получить их копию.",
        "Исправить неверные данные (имя и телефон меняет преподаватель).",
        "Удалить данные и отозвать согласие.",
        "Если считаете, что ваши права нарушены, — обратиться в уполномоченный государственный орган или в суд.",
        `Для запроса напишите в Telegram: ${admin}. Срок ответа — до 30 дней. Чтобы выйти из бота, достаточно его заблокировать; удалить данные можно по запросу через ${admin}.`,
      ],
    },
    {
      title: "9. Безопасность",
      list: [
        "Сайт работает только по зашифрованному соединению HTTPS.",
        "Пароли хранятся в виде хеша — их не видит даже администратор.",
        "Каждый пользователь видит только те данные, которые разрешены его роли.",
        "Код заданий выполняется в изолированном окне браузера.",
      ],
    },
    {
      title: "10. Файлы cookie",
      text: [
        "Cookie — небольшой файл, который сайт сохраняет в вашем браузере. Мы используем только cookie, необходимые для работы сайта; рекламных и отслеживающих cookie нет, поэтому отдельного согласия на них не требуется. Их можно удалить в настройках браузера, но тогда войти в аккаунт не получится.",
      ],
      table: {
        head: ["Название", "Зачем", "Срок"],
        rows: [
          ["cubick_session", "Помнит, что вы вошли (зашифрованная подпись, читает только сервер)", "С галочкой «Запомнить меня» — 180 дней, иначе до закрытия браузера"],
          ["cubick_locale", "Выбранный язык (узбекский / русский)", "1 год"],
          ["cubick_theme", "Светлое или тёмное оформление", "1 год"],
          ["codov_cookies", "Вы закрыли сообщение о cookie", "1 год"],
        ],
      },
    },
    {
      title: "11. Изменения и контакты",
      text: [
        "При изменении политики новая редакция с датой публикуется на этой странице. О важных изменениях сообщим на платформе.",
        `Вопросы: Telegram ${admin}, сайт ${site}.`,
      ],
    },
  ],
};

export function getPolicy(locale: Locale): Policy {
  return locale === "ru" ? ru : uz;
}
