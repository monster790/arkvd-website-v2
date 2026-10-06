import Image from "next/image";
import { WaitlistForm, WaitlistProvider } from "./components/WaitlistForm";

const LAUNCH = "Spring 2027";

const FEATURES: { n: string; title: React.ReactNode; body: string; accent?: boolean }[] = [
  { n: "01", title: <>Log it on the way<br />home</>, body: "Nothing to do on the floor. Pick the slot from tonight's timetable, rate it out of five for yourself, then let your Shazams land in the set they came from." },
  { n: "02", title: "Plan the day", body: "Mark what you're going to. Festival timetables show clashes before you get there. Follow the venues, promoters and artists you actually go to." },
  { n: "03", title: "Friends, not followers", body: "Your feed is your friends, newest first. No algorithm, no likes, no public scores. Visitors never see your stars." },
  { n: "04", title: "Run it back", body: "Every December, your year in sets becomes a poster. Save it, share it, or have it printed and mailed.", accent: true },
];

export default function Home() {
  return (
    <WaitlistProvider>
      <header className="header">
        <div className="wrap">
          <a href="#top" aria-label="ARKVD home">
            <Image src="/logo-cream.png" alt="ARKVD" width={112} height={18} style={{ height: "auto" }} priority />
          </a>
          <a href="#join" className="btn-outline">Get early access</a>
        </div>
      </header>

      <main>
        <section id="top" className="hero">
          <div className="wrap">
            <div className="hero-inner">
              <div className="label">Early access · iOS + Android · {LAUNCH}</div>
              <h1 className="display">Dance now.<br />Archive later.</h1>
              <p>A diary for every DJ set you saw. Rate it for yourself. Rewind the ones you'd run back. Log it on the train home.</p>
              <WaitlistForm variant="hero" cta="Join the list" />
            </div>
          </div>
        </section>

        <section className="marks">
          <div className="wrap">
            <h2 className="display">Three marks. That's the whole system.</h2>
            <div className="marks-grid">
              <div className="mark"><span className="mark-logged" /><h3 className="display">Logged</h3><p>You were there. Rate it out of five. Only you ever see the stars.</p></div>
              <div className="mark"><span className="mark-planned" /><h3 className="display">Planned</h3><p>You're going. Build your night from the timetable, clashes and all.</p></div>
              <div className="mark"><span className="mark-rewound" aria-hidden>↺</span><h3 className="display">Rewound</h3><p>You'd run it back. The one public signal. It counts, it doesn't score.</p></div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="wrap">
            {FEATURES.map((f) => (
              <div className="feature" key={f.n}>
                <span className={f.accent ? "tag tag-blue" : "tag"}>{f.n}</span>
                <div className="feature-body">
                  <h3 className="display">{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="join" className="join">
          <div className="wrap main">
            <div className="label">Early access</div>
            <h2 className="display">Be first on the floor.</h2>
            <WaitlistForm variant="footer" cta="Get early access" />
          </div>
          <footer className="footer">
            <div className="wrap label">
              <Image src="/logo-ink.png" alt="ARKVD" width={96} height={16} style={{ height: "auto" }} />
              <nav>
                <a href="/privacy">Privacy</a>
                <a href="https://www.instagram.com/arkvd00/" target="_blank" rel="noreferrer">Instagram</a>
                <a href="mailto:hello@arkvd.app">Contact</a>
              </nav>
              <span>© 2026 ARKVD</span>
            </div>
          </footer>
        </section>
      </main>
    </WaitlistProvider>
  );
}
