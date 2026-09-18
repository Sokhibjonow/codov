import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  FlaskConical,
  LogIn,
  MessageCircle,
  Megaphone,
  Phone,
  Send,
  UserCheck,
  BookOpen,
  Database,
  Globe,
  HeartHandshake,
  Laptop,
  MonitorPlay,
  School,
  LayoutTemplate,
  Server,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LeadForm } from "./LeadForm";
import { RevealOnScroll } from "./RevealOnScroll";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { CONTACTS, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import type { ThemeMode } from "@/lib/theme";

type LandingProps = { t: Dictionary; locale: Locale; theme: ThemeMode | null };

const FEATURE_ICONS: LucideIcon[] = [BookOpen, Code2, FlaskConical, Bot, UserCheck, MessageCircle];
/** Offline, online with the teacher, only Codov */
const FORMAT_ICONS: LucideIcon[] = [School, MonitorPlay, Laptop];
/** Web Basics, Frontend, Backend, Database, Tools, AI & Web */
const TRACK_ICONS: LucideIcon[] = [Globe, LayoutTemplate, Server, Database, Wrench, Sparkles];

// Tells search engines what codov is (structured data, not shown on the page)
const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "codov",
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  description: SITE_DESCRIPTION,
  areaServed: "UZ",
  knowsAbout: ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Tailwind CSS", "Node.js", "Express", "REST API", "MySQL", "SQL", "Git", "AI"],
  inLanguage: ["uz", "ru"],
  telephone: CONTACTS.phone || undefined,
  sameAs: [CONTACTS.instagram, CONTACTS.channel, CONTACTS.telegram && `https://t.me/${CONTACTS.telegram}`].filter(Boolean),
};

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Instagram and the Telegram channel, as buttons or (compact) as icon links */
function SocialLinks({ labels, compact = false }: { labels: Dictionary["landing"]["contact"]; compact?: boolean }) {
  const links = [
    CONTACTS.instagram && { href: CONTACTS.instagram, label: labels.instagram, icon: <InstagramIcon /> },
    CONTACTS.channel && { href: CONTACTS.channel, label: labels.channel, icon: <Megaphone size={18} /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  return links.map((link) =>
    compact ? (
      <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} title={link.label} className="hover:text-foreground">
        {link.icon}
      </a>
    ) : (
      <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="btn border border-border bg-surface px-5 py-2.5">
        {link.icon}
        {link.label}
      </a>
    ),
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div data-reveal className="mx-auto mb-10 max-w-2xl text-center">
      <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-muted">{subtitle}</p>}
    </div>
  );
}

/** Public home page: what codov is, for students and parents; the platform itself is behind the login. */
export function Landing({ t, locale, theme }: LandingProps) {
  const l = t.landing;

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <RevealOnScroll />

      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/" aria-label="codov">
            <Logo size={30} />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-bold text-muted lg:flex">
            <a href="#formats" className="hover:text-foreground">{l.nav.formats}</a>
            <a href="#learn" className="hover:text-foreground">{l.nav.learn}</a>
            <a href="#how" className="hover:text-foreground">{l.nav.how}</a>
            <a href="#parents" className="hover:text-foreground">{l.nav.parents}</a>
            <a href="#faq" className="hover:text-foreground">{l.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeSwitcher initial={theme} labels={t.common.theme} />
            </div>
            <LanguageSwitcher current={locale} label={t.common.language} />
            <Link href="/login" className="btn btn-primary px-3 py-2 text-sm">
              <LogIn size={16} />
              <span className="hidden sm:inline">{l.nav.login}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy text-white">
          <div aria-hidden="true" className="landing-drift absolute -right-32 -top-32 size-[28rem] rotate-12 rounded-[5rem] bg-brand/25" />
          <div aria-hidden="true" className="absolute -bottom-40 -left-24 size-96 -rotate-12 rounded-[4rem] bg-brand-light/10" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-2">
            <div>
              <p data-reveal className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-brand-light">{l.hero.badge}</p>
              <h1 data-reveal style={{ "--reveal-delay": `${100}ms` } as React.CSSProperties} className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">{l.hero.title}</h1>
              <p data-reveal style={{ "--reveal-delay": `${200}ms` } as React.CSSProperties} className="mt-5 max-w-xl text-lg text-white/80">{l.hero.text}</p>
              <div data-reveal style={{ "--reveal-delay": `${300}ms` } as React.CSSProperties} className="mt-8 flex flex-wrap gap-3">
                <a href="#contact" className="btn bg-brand-light px-6 py-3 text-navy hover:bg-white">
                  {l.hero.cta}
                  <ArrowRight size={18} />
                </a>
                <Link href="/login" className="btn border border-white/25 px-6 py-3 text-white hover:bg-white/10">
                  {l.hero.login}
                </Link>
              </div>
              <ul data-reveal style={{ "--reveal-delay": `${400}ms` } as React.CSSProperties} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                {l.hero.chips.map((chip) => (
                  <li key={chip} className="flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-brand-light" />
                    {chip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Editor + preview mock */}
            <div data-reveal style={{ "--reveal-delay": `${250}ms` } as React.CSSProperties} className="relative mx-auto w-full max-w-lg" aria-hidden="true">
              <div className="overflow-hidden rounded-2xl bg-[#1e1e1e] shadow-2xl ring-1 ring-white/10">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                  <span className="size-3 rounded-full bg-[#ff5f57]" />
                  <span className="size-3 rounded-full bg-[#febc2e]" />
                  <span className="size-3 rounded-full bg-[#28c840]" />
                  <span className="ml-3 font-mono text-xs text-white/50">index.html</span>
                </div>
                <pre className="overflow-x-auto p-5 pb-28 font-mono text-sm leading-relaxed text-[#d4d4d4]">
                  <code>
                    <span className="text-brand-light">&lt;h1&gt;</span>
                    {l.hero.previewTitle}
                    <span className="text-brand-light">&lt;/h1&gt;</span>
                    {"\n"}
                    <span className="text-brand-light">&lt;button</span> <span className="text-[#9cdcfe]">class</span>=
                    <span className="text-[#ce9178]">&quot;btn&quot;</span>
                    <span className="text-brand-light">&gt;</span>
                    Salom!
                    <span className="text-brand-light">&lt;/button&gt;</span>
                    <span className="landing-caret ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-brand-light" />
                  </code>
                </pre>
              </div>
              <div className="landing-float absolute -bottom-12 -right-2 w-64 rounded-2xl bg-white p-4 text-[#141B2D] shadow-2xl sm:-right-8">
                <p className="text-lg font-extrabold">{l.hero.previewTitle}</p>
                <span className="mt-2 inline-block rounded-lg bg-[#D9502A] px-3 py-1.5 text-sm font-bold text-white">Salom!</span>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#16a34a]">
                  <CheckCircle2 size={14} />
                  {l.hero.previewText}
                </p>
              </div>
            </div>
          </div>
          <div className="h-10" />
        </section>

        {/* Three ways to learn: courses + platform + teacher */}
        <section id="formats" className="scroll-mt-20 px-4 pt-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionTitle title={l.formats.title} subtitle={l.formats.subtitle} />
            <p className="mb-10 flex flex-wrap items-center justify-center gap-2 text-lg font-extrabold">
              <span className="text-brand">Codov</span>
              <span className="text-muted">=</span>
              {l.formats.formula.map((part, index) => (
                <span key={part} className="flex items-center gap-2">
                  {index > 0 && <span className="text-muted">+</span>}
                  <span className="rounded-full border border-border bg-surface px-4 py-1.5">{part}</span>
                </span>
              ))}
            </p>
            <div className="grid gap-5 lg:grid-cols-3">
              {l.formats.items.map((item, index) => {
                const Icon = FORMAT_ICONS[index] ?? Laptop;
                const selfPaced = index === l.formats.items.length - 1;
                return (
                  <article
                    key={item.title}
                    data-reveal style={{ "--reveal-delay": `${index * 100}ms` } as React.CSSProperties}
                    className={`card flex flex-col ${selfPaced ? "border-primary ring-4 ring-primary/10" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon size={24} />
                      </span>
                      <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-muted">{item.badge}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold">{item.title}</h3>
                    <p className="mt-2 flex-1 text-muted">{item.text}</p>
                    <ol className="mt-5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                      {item.flow.map((step, stepIndex) => (
                        <li key={step} className="flex items-center gap-1.5">
                          {stepIndex > 0 && <ArrowRight size={14} className="text-muted" />}
                          <span
                            className={`rounded-lg px-2.5 py-1 ${
                              stepIndex === item.flow.length - 1 ? "bg-primary text-on-color" : "bg-background"
                            }`}
                          >
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })}
            </div>
            <p data-reveal className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl bg-primary-soft p-5 font-semibold text-primary">
              <HeartHandshake size={22} className="mt-0.5 shrink-0" />
              {l.formats.note}
            </p>
          </div>
        </section>

        {/* What you'll learn */}
        <section id="learn" className="scroll-mt-20 px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionTitle title={l.learn.title} subtitle={l.learn.subtitle} />
            <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {l.learn.items.map((item, index) => {
                const Icon = TRACK_ICONS[index] ?? Code2;
                return (
                  <li key={item.name} data-reveal style={{ "--reveal-delay": `${(index % 3) * 100}ms` } as React.CSSProperties} className="card flex flex-col transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon size={24} />
                      </span>
                      <span className="font-mono text-3xl font-extrabold text-border">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-4 text-2xl font-extrabold">{item.name}</h3>
                    <p className="mt-2 flex-1 text-muted">{item.text}</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {item.topics.map((topic) => (
                        <li key={topic} className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs font-bold">
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* How learning works */}
        <section id="how" className="scroll-mt-20 bg-surface px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionTitle title={l.features.title} subtitle={l.features.subtitle} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {l.features.items.map((item, index) => {
                const Icon = FEATURE_ICONS[index] ?? BookOpen;
                return (
                  <article key={item.title} data-reveal style={{ "--reveal-delay": `${(index % 3) * 100}ms` } as React.CSSProperties} className="rounded-2xl border border-border bg-background p-6">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-4 text-lg font-extrabold">{item.title}</h3>
                    <p className="mt-2 text-muted">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <SectionTitle title={l.steps.title} />
            <ol className="grid gap-5 md:grid-cols-4">
              {l.steps.items.map((item, index) => (
                <li key={item.title} data-reveal style={{ "--reveal-delay": `${index * 100}ms` } as React.CSSProperties} className="card relative">
                  <span className="text-4xl font-extrabold text-brand">{index + 1}</span>
                  <h3 className="mt-2 text-lg font-extrabold">{item.title}</h3>
                  <p className="mt-1 text-muted">{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Parents */}
        <section id="parents" className="scroll-mt-20 px-4 pb-20 md:px-6">
          <div data-reveal className="mx-auto grid max-w-6xl items-center gap-10 rounded-3xl bg-navy p-8 text-white md:p-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{l.parents.title}</h2>
              <p className="mt-4 text-lg text-white/80">{l.parents.text}</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {l.parents.items.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-brand-light" />
                  <span className="font-semibold">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-surface px-4 py-20 md:px-6">
          <div className="mx-auto max-w-3xl">
            <SectionTitle title={l.faq.title} />
            <div className="space-y-3">
              {l.faq.items.map((item) => (
                <details key={item.q} data-reveal className="group rounded-2xl border border-border bg-background px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {item.q}
                    <span className="text-xl text-primary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact: sign-up request form, then Telegram and socials */}
        <section id="contact" className="scroll-mt-20 px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div
              data-reveal
              className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-sm md:p-10"
            >
              <div className="relative z-10 max-w-3xl">
                <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">{l.lead.title}</h2>
                <p className="mt-2 text-muted">{l.lead.text}</p>
                <div className="mt-6">
                  <LeadForm t={l.lead} />
                </div>
              </div>
              {/* Q / A speech bubbles */}
              <div aria-hidden="true" className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 lg:block">
                <div className="landing-float relative size-44">
                  <span className="absolute left-0 top-0 flex size-24 -rotate-6 items-center justify-center rounded-3xl rounded-bl-md bg-navy text-5xl font-extrabold text-white shadow-2xl dark:ring-1 dark:ring-white/15">
                    Q
                  </span>
                  <span className="absolute bottom-0 right-4 flex size-24 rotate-6 items-center justify-center rounded-3xl rounded-br-md bg-gradient-to-br from-brand-light to-brand text-5xl font-extrabold text-white shadow-2xl">
                    A
                  </span>
                </div>
              </div>
            </div>

            <div data-reveal className="mt-10 text-center">
              <p className="text-sm font-bold text-muted">{l.lead.orTelegram}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {CONTACTS.telegram && (
                  <a href={`https://t.me/${CONTACTS.telegram}`} className="btn btn-primary px-6 py-3" target="_blank" rel="noopener noreferrer">
                    <Send size={18} />
                    {l.contact.telegram}
                  </a>
                )}
                {CONTACTS.phone && (
                  <a href={`tel:${CONTACTS.phone}`} className="btn border border-border bg-surface px-6 py-3">
                    <Phone size={18} />
                    {CONTACTS.phoneLabel}
                  </a>
                )}
                <SocialLinks labels={l.contact} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <div>
            <Logo size={24} />
            <p className="mt-2">{l.footer}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {CONTACTS.telegram && (
              <a href={`https://t.me/${CONTACTS.telegram}`} className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                @{CONTACTS.telegram}
              </a>
            )}
            {CONTACTS.phone && (
              <a href={`tel:${CONTACTS.phone}`} className="hover:text-foreground">
                {CONTACTS.phoneLabel}
              </a>
            )}
            <SocialLinks labels={l.contact} compact />
          </div>
          <p className="w-full sm:w-auto">© {new Date().getFullYear()} codov</p>
        </div>
      </footer>
    </div>
  );
}
