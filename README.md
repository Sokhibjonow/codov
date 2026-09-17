# codov

Учебная платформа по HTML, CSS и JavaScript: уроки, задания с редактором кода, проверка работ, чат, кабинеты ученика и родителя. Интерфейс на узбекском и русском.

## Технологии

Next.js 16 · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 7

## Первый запуск

1. Установите PostgreSQL 16 и запомните пароль пользователя `postgres`.
2. Откройте файл `.env` и замените `PASSWORD` в `DATABASE_URL` на этот пароль.
3. Создайте базу и таблицы:

   ```bash
   npm run db:migrate
   ```

4. Создайте аккаунт преподавателя (пароль покажется один раз):

   ```bash
   npm run create-admin
   ```

5. Запустите сайт и откройте http://localhost:3000:

   ```bash
   npm run dev
   ```

## Временная ссылка для других устройств

Пока сайт не перенесён на сервер, его можно открыть с телефона или другого компьютера,
если этот компьютер включён. Нужны два окна терминала в папке проекта:

1. Сайт в быстром режиме:

   ```bash
   npm run serve
   ```

2. Ссылка через интернет (адрес вида `https://….trycloudflare.com` появится в окне):

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

Ссылка меняется при каждом запуске туннеля.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | сайт в режиме разработки |
| `npm run build` / `npm start` | сборка и запуск в продакшене |
| `npm run db:migrate` | применить изменения схемы базы (разработка) |
| `npm run db:deploy` | применить миграции на сервере |
| `npm run db:studio` | посмотреть данные в базе через браузер |
| `npm run create-admin -- [логин] [имя]` | создать преподавателя или сбросить его пароль |
| `npm run typecheck` / `npm run lint` | проверки кода |

## Структура

```
prisma/schema.prisma      схема базы данных
scripts/                  служебные скрипты
src/app/login             вход
src/app/admin             кабинет преподавателя
src/app/student           кабинет ученика
src/app/parent            кабинет родителя
src/components            общие компоненты (оболочка, логотип…)
src/i18n                  переводы uz / ru
src/lib                   база, сессии, пароли
src/proxy.ts              защита разделов по ролям
```

## Сервер с доменом

Всё запускается в Docker: сайт, база PostgreSQL, Caddy (сам получает и продлевает HTTPS-сертификат)
и резервное копирование (каждую ночь в 03:00, хранятся 14 дней в `data/backups`).

**Что нужно:** VPS с Ubuntu 22.04/24.04 (от 2 ядер, 4 ГБ памяти, 40 ГБ диска) и домен.
У регистратора домена создайте A-записи `@` и `www` на IP сервера.

1. На этом компьютере соберите файлы для переноса (появится папка `to-server`):

   ```bash
   powershell -ExecutionPolicy Bypass -File scripts/pack-for-server.ps1
   ```

2. Скопируйте папку на сервер и распакуйте проект:

   ```bash
   scp -r to-server root@IP_СЕРВЕРА:/root/
   ```

   ```bash
   mkdir -p /opt/codov && tar xzf /root/to-server/codov.tar.gz -C /opt/codov && cd /opt/codov
   ```

3. Установите и запустите (спросит домен и ключ Gemini):

   ```bash
   sudo bash deploy/install.sh
   ```

4. Перенесите данные (курсы, ученики, работы, файлы):

   ```bash
   sudo bash deploy/restore.sh /root/to-server/codov.dump /root/to-server/uploads.tar.gz
   ```

**Обновление сайта:** скопируйте новый `codov.tar.gz`, распакуйте поверх и выполните `sudo bash deploy/update.sh`
(перед обновлением делается резервная копия).

**Полезные команды** (в папке `/opt/codov`):

| Что | Команда |
|---|---|
| Состояние | `sudo docker compose ps` |
| Журнал сайта | `sudo docker compose logs app --tail 100` |
| Резервная копия сейчас | `sudo docker compose exec backup sh /backup.sh` |
| Новый пароль преподавателя | `sudo docker compose exec app npm run create-admin` |

Копии в `data/backups` лежат на том же сервере — раз в неделю скачивайте свежие на свой компьютер.

## Vercel (бесплатно)

Сайт работает на Vercel, база — Neon, файлы — Vercel Blob. Отличия от сервера:
чат обновляется раз в 3 секунды (когда открыт), ИИ-проверка идёт порциями во время запросов.

**Один раз:**
1. Зарегистрироваться на vercel.com, в терминале проекта: `npx vercel login`.
2. `npx vercel link` — создать проект `codov`.
3. В проекте на vercel.com → **Storage**: создать **Neon** (регион Frankfurt) и **Blob** (Public), подключить к проекту.
4. **Settings → Environment Variables:** `SESSION_SECRET` (длинная случайная строка) и `GEMINI_API_KEY`.
5. `npx vercel env pull .env.vercel`, затем перенос данных с компьютера: `npm run move-to-vercel -- --yes`.

**Выкладка новой версии:**

```bash
npx vercel --prod
```

Миграции базы применяются автоматически при сборке (`vercel-build`).
