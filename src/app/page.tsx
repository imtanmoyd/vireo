import { ArrowUpRight, Check, Sprout, Timer, TrendingUp, Moon, Bell, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";

const bars = [38, 62, 45, 78, 56, 88, 70];

const features = [
  {
    icon: TrendingUp,
    title: "Momentum, measured",
    body: "Streaks, focus minutes and habit trends surface automatically — you see progress without keeping score yourself.",
  },
  {
    icon: Timer,
    title: "Focus that protects itself",
    body: "A pomodoro engine that logs real sessions and nudges you at the right moment. Deep work becomes the default.",
  },
  {
    icon: Moon,
    title: "Rhythms, not rigid plans",
    body: "Weekly routines map to the shape of your real life. Miss a day and Vireo bends — it never breaks.",
  },
  {
    icon: Bell,
    title: "Quiet by design",
    body: "No red badges or alarm fatigue. One calm check-in per day; everything else waits politely for you.",
  },
  {
    icon: Shield,
    title: "Yours, encrypted",
    body: "Your journal and habits are scoped to your account with row-level security. Export everything, anytime.",
  },
  {
    icon: Sprout,
    title: "Growth you can see",
    body: "Every habit grows a living garden. Consistency literally takes root — skip a week and you'll notice.",
  },
];

export default function Home() {
  return (
    <main className="lp">
      {/* Ambient background */}
      <div className="lp-bg" aria-hidden="true">
        <span className="lp-orb lp-orb-a" />
        <span className="lp-orb lp-orb-b" />
        <span className="lp-orb lp-orb-c" />
        <span className="lp-grid" />
        <span className="lp-grain" />
      </div>

      {/* Nav */}
      <nav className="lp-nav">
        <Link className="lp-brand" href="/">
          <span className="lp-brand-mark"><Sprout size={15} strokeWidth={2.5} /></span>
          vireo
        </Link>
        <div className="lp-nav-links">
          <a href="#features">Product</a>
          <a href="#preview">Preview</a>
          <a href="#signup">Pricing</a>
        </div>
        <div className="lp-nav-actions">
          <a className="lp-nav-signin" href="#signup">Sign in</a>
          <a className="lp-nav-cta" href="#signup">
            Get started <ArrowUpRight size={14} />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <div className="lp-eyebrow lp-rise" style={{ animationDelay: "0.05s" }}>
            <Sparkles size={13} /> Your day, in rhythm
          </div>
          <h1 className="lp-rise" style={{ animationDelay: "0.15s" }}>
            The calm operating system for{" "}
            <span className="lp-grad-text">your best year.</span>
          </h1>
          <p className="lp-hero-sub lp-rise" style={{ animationDelay: "0.28s" }}>
            Vireo weaves your routines, habits and focus into one quiet system —
            so progress stops depending on willpower.
          </p>
          <div className="lp-hero-proof lp-rise" style={{ animationDelay: "0.4s" }}>
            <div className="lp-proof-avatars" aria-hidden="true">
              <span>AK</span><span>JM</span><span>RS</span><span>+2k</span>
            </div>
            <p>
              <strong>2,400+</strong> people building steadier days
              <span className="lp-proof-stars">★★★★★</span>
            </p>
          </div>
          <div className="lp-hero-cta lp-rise" style={{ animationDelay: "0.5s" }}>
            <a className="lp-primary-btn" href="#signup">Start free — no email needed</a>
            <a className="lp-ghost-btn" href="#preview">See how it works</a>
          </div>
        </div>

        {/* Auth card */}
        <div id="signup" className="lp-auth-wrap lp-rise" style={{ animationDelay: "0.35s" }}>
          <AuthPanel />
        </div>
      </section>


      {/* Animated preview */}
      <section id="preview" className="lp-preview-section">
        <div className="lp-preview lp-rise" style={{ animationDelay: "0.55s" }}>
          <div className="lp-preview-header">
            <span className="lp-preview-dot" /><span className="lp-preview-dot" /><span className="lp-preview-dot" />
            <span className="lp-preview-title">vireo — today</span>
          </div>
          <div className="lp-preview-body">
            <div className="lp-preview-col">
              <div className="lp-mini-label">FOCUS RHYTHM · THIS WEEK</div>
              <div className="lp-chart">
                {bars.map((h, i) => (
                  <span
                    key={i}
                    className="lp-bar"
                    style={{ height: `${h}%`, animationDelay: `${1 + i * 0.12}s` }}
                  />
                ))}
              </div>
              <div className="lp-chart-days">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div className="lp-stat-row">
                <div className="lp-stat">
                  <span className="lp-stat-num">186<span className="lp-stat-unit">m</span></span>
                  <span className="lp-stat-cap">focused</span>
                </div>
                <div className="lp-stat">
                  <span className="lp-stat-num">14<span className="lp-stat-unit">d</span></span>
                  <span className="lp-stat-cap">streak</span>
                </div>
                <div className="lp-stat">
                  <span className="lp-stat-num">92<span className="lp-stat-unit">%</span></span>
                  <span className="lp-stat-cap">rhythm kept</span>
                </div>
              </div>
            </div>

            <div className="lp-preview-col">
              <div className="lp-mini-label">TODAY</div>
              <div className="lp-todo">
                <span className="lp-check done"><Check size={11} strokeWidth={3} /></span>
                <span className="done-text">Morning walk</span>
              </div>
              <div className="lp-todo">
                <span className="lp-check done"><Check size={11} strokeWidth={3} /></span>
                <span className="done-text">Read 20 pages</span>
              </div>
              <div className="lp-todo">
                <span className="lp-check pulse" />
                <span>Deep work · 25:00</span>
              </div>
              <div className="lp-ring-wrap">
                <svg viewBox="0 0 120 120" className="lp-ring">
                  <circle cx="60" cy="60" r="52" className="lp-ring-track" />
                  <circle cx="60" cy="60" r="52" className="lp-ring-fill" />
                </svg>
                <div className="lp-ring-center">
                  <strong>68%</strong>
                  <span>of today&apos;s plan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="lp-features">
        <h2 className="lp-features-title lp-rise">
          Built for consistency, <span className="lp-grad-text">not intensity.</span>
        </h2>
        <div className="lp-feature-grid">
          {features.map((f, i) => (
            <article key={f.title} className="lp-feature-card" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
              <span className="lp-feature-icon"><f.icon size={19} /></span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <span className="lp-footer-brand"><Sprout size={13} /> vireo</span>
        <span>Designed for consistency, not intensity.</span>
        <Link className="lp-footer-link" href="/dashboard">
          Open workspace <ArrowUpRight size={13} />
        </Link>
      </footer>
    </main>
  );
}