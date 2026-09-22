import { ArrowUpRight, Check, Circle, Leaf, Sparkles } from "lucide-react";
import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";

const habits = [
  { label: "Morning walk", color: "bg-lime-400", done: true },
  { label: "Read 20 pages", color: "bg-violet-400", done: true },
  { label: "Deep work", color: "bg-orange-300", done: false },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="nav-shell">
        <Link className="brand" href="/">
          <span className="brand-mark"><Leaf size={16} strokeWidth={2.5} /></span>
          vireo
        </Link>
        <div className="nav-actions">
          <span className="nav-note">A calmer way to get things done</span>
          <Link className="text-link" href="/dashboard">
            Open workspace <ArrowUpRight size={15} />
          </Link>
        </div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> Your day, in rhythm</div>
          <h1>Make space for the life you&apos;re building.</h1>
          <p className="hero-description">
            Vireo brings your routines, focus, and small daily wins into one
            calm home base. Less noise. More momentum.
          </p>
          <AuthPanel />
          <p className="fine-print">Free to start · Your data stays yours</p>
        </div>

        <div className="preview-wrap" aria-label="Preview of the Vireo dashboard">
          <div className="preview-glow" />
          <div className="dashboard-preview">
            <div className="preview-topline">
              <span className="preview-logo"><Leaf size={13} /> vireo</span>
              <span className="preview-date">Tuesday, September 18</span>
              <span className="avatar">AK</span>
            </div>
            <div className="preview-heading">
              <div><span className="muted-label">GOOD MORNING, ALEX</span><h2>Let&apos;s make it count.</h2></div>
              <span className="streak-pill">12 day streak <span>↗</span></span>
            </div>
            <div className="preview-cards">
              <div className="preview-card today-card">
                <div className="card-heading"><span>Today&apos;s focus</span><span className="card-count">2 / 3</span></div>
                {habits.map((habit) => (
                  <div className="habit-row" key={habit.label}>
                    <span className={`habit-dot ${habit.color}`}><Check size={11} /></span>
                    <span className={habit.done ? "completed" : ""}>{habit.label}</span>
                    {!habit.done && <Circle className="empty-circle" size={15} />}
                  </div>
                ))}
              </div>
              <div className="preview-card tree-card">
                <div className="card-heading"><span>Your garden</span><span className="card-link">View all ↗</span></div>
                <div className="tree-art" aria-hidden="true">
                  <span className="tree-sun" />
                  <span className="tree-trunk" />
                  <span className="tree-crown tree-crown-one" />
                  <span className="tree-crown tree-crown-two" />
                  <span className="tree-ground" />
                </div>
                <span className="tree-caption">Growing steadily <span>·</span> Stage 3</span>
              </div>
            </div>
            <div className="preview-bottom">
              <div><span className="muted-label">NEXT UP</span><strong>Deep work session</strong></div>
              <span className="timer">25:00</span>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-footer">
        <span>Designed for consistency, not intensity.</span>
        <span className="footer-dots"><i /><i /><i /></span>
        <span>Build a life that feels like yours.</span>
      </div>
    </main>
  );
}
