import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Flame,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";

const LS_KEY = "reading-seals-tracker:v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DEFAULT_SEALS = [
  {
    id: "seal_disciple",
    title: "The Disciple",
    theme: "Discipleship",
    flavor: "Earned by pursuing the slow craft of formation—then turning it outward.",
    palette: "ember",
    icon: "Flame",
    triumphs: [
      { id: uid("t"), text: "Finish 3 discipleship books", tier: "Bronze", done: false },
      { id: uid("t"), text: "Read 20 minutes, 5 days in a row", tier: "Bronze", done: false },
      { id: uid("t"), text: "Write a 1-paragraph summary for 5 chapters", tier: "Silver", done: false },
      { id: uid("t"), text: "Create a practical action plan from one book", tier: "Silver", done: false },
      { id: uid("t"), text: "Teach one concept to a student/leader", tier: "Gold", done: false },
      { id: uid("t"), text: "Discuss a book with someone (30+ min)", tier: "Gold", done: false },
    ],
    books: [],
    earnedOn: undefined,
    gildsByYear: {},
    gildHistory: [],
  },
  {
    id: "seal_theologian",
    title: "The Theologian",
    theme: "Doctrine & Theology",
    flavor: "Earned by loving God with the mind—and letting it reshape the heart.",
    palette: "aether",
    icon: "Sparkles",
    triumphs: [
      { id: uid("t"), text: "Finish 2 theology books (200+ pages)", tier: "Bronze", done: false },
      { id: uid("t"), text: "Take notes on 10 chapters", tier: "Bronze", done: false },
      { id: uid("t"), text: "Summarize one doctrine in 250 words", tier: "Silver", done: false },
      { id: uid("t"), text: "Find 10 supporting Scripture references", tier: "Silver", done: false },
      { id: uid("t"), text: "Write a short teaching outline (10–15 min)", tier: "Gold", done: false },
      { id: uid("t"), text: "Apply one doctrine to a real counseling scenario", tier: "Gold", done: false },
    ],
    books: [],
    earnedOn: undefined,
    gildsByYear: {},
    gildHistory: [],
  },
  {
    id: "seal_shepherd",
    title: "The Shepherd",
    theme: "Pastoral Leadership",
    flavor: "Earned by reading with names and faces in mind.",
    palette: "verdant",
    icon: "Shield",
    triumphs: [
      { id: uid("t"), text: "Finish 2 leadership/pastoral books", tier: "Bronze", done: false },
      { id: uid("t"), text: "Create a volunteer development idea", tier: "Silver", done: false },
      { id: uid("t"), text: "Write a one-page ministry policy/update", tier: "Silver", done: false },
      { id: uid("t"), text: "Implement one change for 4 weeks", tier: "Gold", done: false },
      { id: uid("t"), text: "Debrief the change with a leader", tier: "Gold", done: false },
    ],
    books: [],
    earnedOn: undefined,
    gildsByYear: {},
    gildHistory: [],
  },
];

const PALETTES = {
  ember: {
    name: "Ember",
    bg: "from-orange-500/25 via-rose-500/15 to-amber-500/10",
    glow: "shadow-orange-500/20",
    chip: "bg-orange-500/15 text-orange-200 border-orange-400/25",
  },
  aether: {
    name: "Aether",
    bg: "from-sky-500/20 via-indigo-500/15 to-cyan-500/10",
    glow: "shadow-sky-500/20",
    chip: "bg-sky-500/15 text-sky-200 border-sky-300/25",
  },
  verdant: {
    name: "Verdant",
    bg: "from-emerald-500/20 via-lime-500/15 to-teal-500/10",
    glow: "shadow-emerald-500/20",
    chip: "bg-emerald-500/15 text-emerald-200 border-emerald-300/25",
  },
  void: {
    name: "Void",
    bg: "from-fuchsia-500/15 via-violet-500/15 to-slate-500/10",
    glow: "shadow-fuchsia-500/20",
    chip: "bg-fuchsia-500/15 text-fuchsia-100 border-fuchsia-300/25",
  },
  iron: {
    name: "Iron",
    bg: "from-slate-400/15 via-zinc-400/10 to-stone-400/10",
    glow: "shadow-slate-500/20",
    chip: "bg-white/5 text-white/80 border-white/10",
  },
};

const TIER_META = {
  Bronze: { icon: Trophy, chip: "bg-white/5 border-white/10 text-white/80" },
  Silver: { icon: Star, chip: "bg-white/5 border-white/10 text-white/90" },
  Gold: { icon: Crown, chip: "bg-amber-500/15 border-amber-300/25 text-amber-100" },
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function calcCompletion(seal) {
  const total = seal.triumphs.length;
  const done = seal.triumphs.filter((t) => t.done).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function iconFor(name) {
  const map = { Flame, Sparkles, Shield, Trophy, Star, Crown };
  return map[name] || Trophy;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

function Emblem({ paletteKey = "ember", seed = "seed", size = 84 }) {
  const h = hash(seed);
  const a = (h % 360 + 360) % 360;
  const b = (hash(seed + "b") % 360 + 360) % 360;
  const c = (hash(seed + "c") % 360 + 360) % 360;
  const dotCount = 18 + (h % 14);

  const dots = Array.from({ length: dotCount }).map((_, i) => {
    const r = 12 + ((hash(seed + i) % 22 + 22) % 22);
    const ang = ((hash(seed + "a" + i) % 360) * Math.PI) / 180;
    const x = 50 + Math.cos(ang) * r;
    const y = 50 + Math.sin(ang) * r;
    const s = 0.7 + (((hash(seed + "s" + i) % 100) + 100) % 100) / 140;
    const o = 0.15 + (((hash(seed + "o" + i) % 100) + 100) % 100) / 400;
    return { x, y, s, o };
  });

  const sigil = (
    <g>
      <path d="M50 24 L63 42 L50 76 L37 42 Z" fill="url(#g2)" opacity="0.9" />
      <path d="M50 30 L58 42 L50 68 L42 42 Z" fill="rgba(255,255,255,0.12)" />
      <circle cx="50" cy="50" r="10" fill="url(#g3)" opacity="0.85" />
      <path
        d="M40 54 Q50 62 60 54"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="drop-shadow-[0_12px_22px_rgba(0,0,0,0.35)]"
      role="img"
      aria-label="Seal emblem"
    >
      <defs>
        <radialGradient id="g1" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={`hsla(${a}, 90%, 65%, 0.85)`} />
          <stop offset="60%" stopColor={`hsla(${b}, 80%, 55%, 0.35)`} />
          <stop offset="100%" stopColor={`hsla(${c}, 70%, 40%, 0.12)`} />
        </radialGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsla(${b}, 95%, 70%, 0.9)`} />
          <stop offset="100%" stopColor={`hsla(${a}, 90%, 55%, 0.55)`} />
        </linearGradient>
        <radialGradient id="g3" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={`hsla(${a}, 100%, 85%, 0.9)`} />
          <stop offset="100%" stopColor={`hsla(${c}, 80%, 55%, 0.25)`} />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="47" fill="url(#g1)" opacity="0.9" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <circle cx="50" cy="50" r="40" fill="rgba(0,0,0,0.35)" opacity="0.75" />

      {Array.from({ length: 16 }).map((_, i) => {
        const ang = (i / 16) * Math.PI * 2;
        const x1 = 50 + Math.cos(ang) * 40;
        const y1 = 50 + Math.sin(ang) * 40;
        const x2 = 50 + Math.cos(ang) * 44;
        const y2 = 50 + Math.sin(ang) * 44;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={i % 4 === 0 ? 2 : 1}
          />
        );
      })}

      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.s} fill="white" opacity={d.o} />
      ))}

      {sigil}

      <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
    </svg>
  );
}

function ProgressBar({ pct }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
      <motion.div
        className="h-full bg-white/60"
        initial={{ width: 0 }}
        animate={{ width: `${clamp(pct, 0, 100)}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 22 }}
      />
    </div>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border " + className}>
      {children}
    </span>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-white/5 border border-white/10 p-2">
          <Icon className="w-4 h-4 text-white/80" />
        </div>
        <div>
          <div className="text-base font-semibold text-white">{title}</div>
          {subtitle ? <div className="text-sm text-white/60 leading-snug">{subtitle}</div> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden"
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="text-white font-semibold">{title}</div>
              <button
                onClick={onClose}
                className="rounded-xl px-3 py-1.5 text-sm bg-white/5 border border-white/10 hover:bg-white/10 text-white/80"
              >
                Close
              </button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TriumphPanel({ seal, palette, onToggle, onAddTriumph, onRemoveTriumph }) {
  const [text, setText] = useState("");
  const [tier, setTier] = useState("Bronze");
  const [open, setOpen] = useState(true);

  const grouped = useMemo(() => {
    const map = { Bronze: [], Silver: [], Gold: [] };
    for (const t of seal.triumphs) map[t.tier].push(t);
    return map;
  }, [seal.triumphs]);

  return (
    <div className="rounded-3xl bg-white/3 border border-white/10 p-4">
      <button className="w-full" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <SectionTitle
          icon={Trophy}
          title="Triumphs"
          subtitle="Complete all to earn the seal; then gild each year."
          right={
            <div className="inline-flex items-center gap-2">
              <Pill className={palette.chip}>
                {seal.triumphs.filter((t) => t.done).length}/{seal.triumphs.length}
              </Pill>
              {open ? <ChevronDown className="w-4 h-4 text-white/55" /> : <ChevronRight className="w-4 h-4 text-white/55" />}
            </div>
          }
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="mt-4 space-y-3">
              {(["Gold", "Silver", "Bronze"]).map((tierKey) => {
                const items = grouped[tierKey];
                if (!items.length) return null;
                const Meta = TIER_META[tierKey];
                const TierIcon = Meta.icon;
                return (
                  <div key={tierKey} className="rounded-2xl bg-black/25 border border-white/10 p-3">
                    <div className="flex items-center justify-between">
                      <Pill className={Meta.chip}>
                        <TierIcon className="w-3.5 h-3.5" /> {tierKey}
                      </Pill>
                      <div className="text-xs text-white/50">
                        {items.filter((t) => t.done).length}/{items.length}
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {items.map((t) => (
                        <div
                          key={t.id}
                          className={
                            "flex items-start gap-3 rounded-2xl p-2 border transition " +
                            (t.done ? "bg-white/5 border-white/15" : "bg-black/20 border-white/10 hover:border-white/20")
                          }
                        >
                          <button
                            onClick={() => onToggle(seal.id, t.id)}
                            className={
                              "mt-0.5 flex h-6 w-6 items-center justify-center rounded-xl border " +
                              (t.done ? "bg-white/10 border-white/25" : "bg-black/20 border-white/15 hover:bg-white/5")
                            }
                            aria-label={t.done ? "Mark incomplete" : "Mark complete"}
                          >
                            {t.done ? <Check className="w-4 h-4 text-white/85" /> : null}
                          </button>
                          <div className="flex-1">
                            <div className={"text-sm leading-snug " + (t.done ? "text-white/80" : "text-white/90")}>{t.text}</div>
                          </div>
                          <button
                            onClick={() => onRemoveTriumph(seal.id, t.id)}
                            className="rounded-xl px-2 py-1 text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-white/70"
                            title="Remove triumph"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl bg-black/25 border border-white/10 p-3">
                <div className="text-sm text-white/70 mb-2">Add Triumph</div>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g., Finish 1 book over 250 pages"
                    className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35"
                  />
                  <select value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none">
                    <option>Bronze</option>
                    <option>Silver</option>
                    <option>Gold</option>
                  </select>
                  <button
                    onClick={() => {
                      onAddTriumph(seal.id, text, tier);
                      setText("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BooksPanel({ seal, palette, onAddBook, onToggleFinished, onRemoveBook }) {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [notes, setNotes] = useState("");

  const finished = seal.books.filter((b) => b.finished).length;

  return (
    <div className="rounded-3xl bg-white/3 border border-white/10 p-4">
      <button className="w-full" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <SectionTitle
          icon={Shield}
          title="Books"
          subtitle="Attach books to this seal so you can see the whole chase."
          right={
            <div className="inline-flex items-center gap-2">
              <Pill className={palette.chip}>{finished}/{seal.books.length}</Pill>
              {open ? <ChevronDown className="w-4 h-4 text-white/55" /> : <ChevronRight className="w-4 h-4 text-white/55" />}
            </div>
          }
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-black/25 border border-white/10 p-3">
                <div className="text-sm text-white/70 mb-2">Add Book</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35" />
                  <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author (optional)" className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35" />
                  <input value={pages} onChange={(e) => setPages(e.target.value)} placeholder="Pages (optional)" className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35" />
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35" />
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <button
                    onClick={() => {
                      const clean = title.trim();
                      if (!clean) return;
                      onAddBook(seal.id, {
                        title: clean,
                        author: author.trim() || undefined,
                        pages: pages.trim() ? Number(pages.trim()) : undefined,
                        notes: notes.trim() || undefined,
                        finished: false,
                      });
                      setTitle(""); setAuthor(""); setPages(""); setNotes("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {seal.books.length === 0 ? (
                  <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-sm text-white/55">No books yet. Add your current reads here.</div>
                ) : null}

                {seal.books.map((b) => (
                  <div key={b.id} className={"rounded-2xl border p-3 transition " + (b.finished ? "bg-white/5 border-white/15" : "bg-black/20 border-white/10 hover:border-white/20")}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleFinished(seal.id, b.id)}
                        className={"mt-0.5 flex h-6 w-6 items-center justify-center rounded-xl border " + (b.finished ? "bg-white/10 border-white/25" : "bg-black/20 border-white/15 hover:bg-white/5")}
                        aria-label={b.finished ? "Mark unfinished" : "Mark finished"}
                      >
                        {b.finished ? <Check className="w-4 h-4 text-white/85" /> : null}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold truncate">{b.title}</div>
                          <button onClick={() => onRemoveBook(seal.id, b.id)} className="rounded-xl px-2 py-1 text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-white/70">
                            Remove
                          </button>
                        </div>
                        <div className="text-xs text-white/55 mt-0.5">
                          {b.author ? <span>{b.author}</span> : null}
                          {b.author && b.pages ? <span> • </span> : null}
                          {typeof b.pages === "number" ? <span>{b.pages} pages</span> : null}
                        </div>
                        {b.notes ? <div className="mt-2 text-sm text-white/60 leading-snug">{b.notes}</div> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function GildHistoryPanel({ seal, palette }) {
  const year = String(new Date().getFullYear());
  const count = seal.gildsByYear?.[year] || 0;

  return (
    <div className="rounded-3xl bg-white/3 border border-white/10 p-4">
      <SectionTitle
        icon={Crown}
        title="Gild History"
        subtitle="Each gild is a prestige mark—repeatable yearly mastery."
        right={
          <Pill className={palette.chip}>
            <Crown className="w-3.5 h-3.5" /> {year}: x{count}
          </Pill>
        }
      />
      <div className="mt-4 space-y-2">
        {seal.gildHistory?.length ? (
          seal.gildHistory.slice(0, 8).map((g) => (
            <div key={g.id} className="rounded-2xl bg-black/20 border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/80">
                  <span className="font-semibold">Gilded</span> • {g.year}
                </div>
                <div className="text-xs text-white/55">{g.date}</div>
              </div>
              {g.note ? <div className="mt-2 text-sm text-white/60">{g.note}</div> : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-sm text-white/55">
            No gilds yet. Earn the seal, then gild it to mark repeatable progress.
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);

  function exportData() {
    const data = loadState();
    const blob = new Blob([JSON.stringify(data || {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reading-seals-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyJSON() {
    try {
      const data = loadState();
      await navigator.clipboard.writeText(JSON.stringify(data || {}, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  function resetAll() {
    localStorage.removeItem(LS_KEY);
    window.location.reload();
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/3 border border-white/10 p-4">
          <div className="text-sm text-white/75 font-semibold">Backup</div>
          <div className="mt-1 text-sm text-white/55">
            Your data is stored locally in your browser. Export a JSON backup if you want portability.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={exportData} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm">
              Export JSON
            </button>
            <button onClick={copyJSON} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm">
              {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/3 border border-white/10 p-4">
          <div className="text-sm text-white/75 font-semibold">Reset</div>
          <div className="mt-1 text-sm text-white/55">Clears everything and restores the default seals.</div>
          <div className="mt-3">
            <button onClick={resetAll} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-rose-500/15 border border-rose-300/25 hover:bg-rose-500/20 text-sm">
              <Trash2 className="w-4 h-4" /> Reset All
            </button>
          </div>
        </div>

        <div className="text-xs text-white/45">
          Note: This app is Destiny-inspired in structure only. The artwork is procedural and original.
        </div>
      </div>
    </Modal>
  );
}

function NewSealModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [flavor, setFlavor] = useState("");
  const [palette, setPalette] = useState("ember");

  function create() {
    const t = title.trim();
    const th = theme.trim();
    if (!t || !th) return;
    const seal = {
      id: uid("seal"),
      title: t,
      theme: th,
      flavor: flavor.trim() || "A seal forged by steady pages and stubborn joy.",
      palette,
      icon: "Trophy",
      triumphs: [
        { id: uid("t"), text: "Finish 1 book in this theme", tier: "Bronze", done: false },
        { id: uid("t"), text: "Read 15 minutes for 4 days", tier: "Bronze", done: false },
        { id: uid("t"), text: "Write a 200-word summary", tier: "Silver", done: false },
        { id: uid("t"), text: "Apply one insight in real life", tier: "Gold", done: false },
      ],
      books: [],
      earnedOn: undefined,
      gildsByYear: {},
      gildHistory: [],
    };
    onCreate(seal);
    setTitle(""); setTheme(""); setFlavor(""); setPalette("ember");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a New Seal">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <div className="text-sm text-white/75">Seal Name</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., The Classic" className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35" />
        </div>
        <div className="md:col-span-2">
          <div className="text-sm text-white/75">Theme</div>
          <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g., Historic Christian Works" className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35" />
        </div>
        <div className="md:col-span-2">
          <div className="text-sm text-white/75">Flavor text (optional)</div>
          <textarea value={flavor} onChange={(e) => setFlavor(e.target.value)} placeholder="Short lore line…" className="mt-1 w-full min-h-[84px] rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35" />
        </div>
        <div className="md:col-span-2">
          <div className="text-sm text-white/75">Palette</div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(PALETTES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPalette(key)}
                className={"rounded-2xl border p-2 text-left transition " + (palette === key ? "bg-white/8 border-white/20" : "bg-white/3 border-white/10 hover:bg-white/5")}
              >
                <div className={"rounded-xl h-8 bg-gradient-to-br " + val.bg} />
                <div className="mt-2 text-xs text-white/70">{val.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
            <Emblem paletteKey={palette} seed={title || "new"} size={58} />
          </div>
          <div className="text-xs text-white/55">Preview emblem</div>
        </div>
        <button onClick={create} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm">
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>
    </Modal>
  );
}

export default function App() {
  const [seals, setSeals] = useState(() => {
    const s = loadState();
    return s?.seals?.length ? s.seals : DEFAULT_SEALS;
  });
  const [activeId, setActiveId] = useState(() => {
    const s = loadState();
    return s?.activeId || (DEFAULT_SEALS[0]?.id ?? "");
  });
  const [query, setQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showNewSeal, setShowNewSeal] = useState(false);

  const active = useMemo(() => seals.find((x) => x.id === activeId) || seals[0], [seals, activeId]);

  useEffect(() => { saveState({ seals, activeId }); }, [seals, activeId]);

  useEffect(() => {
    setSeals((prev) =>
      prev.map((s) => {
        const c = calcCompletion(s);
        const earned = c.total > 0 && c.done === c.total;
        if (earned && !s.earnedOn) return { ...s, earnedOn: todayISO() };
        return s;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return seals;
    return seals.filter((s) => [s.title, s.theme, s.flavor].join(" ").toLowerCase().includes(q));
  }, [seals, query]);

  function toggleTriumph(sealId, triumphId) {
    setSeals((prev) =>
      prev.map((s) => {
        if (s.id !== sealId) return s;
        const triumphs = s.triumphs.map((t) => (t.id === triumphId ? { ...t, done: !t.done } : t));
        const next = { ...s, triumphs };
        const c = calcCompletion(next);
        if (c.total > 0 && c.done === c.total && !next.earnedOn) next.earnedOn = todayISO();
        return next;
      })
    );
  }

  function addBook(sealId, payload) {
    setSeals((prev) => prev.map((s) => (s.id === sealId ? { ...s, books: [{ id: uid("b"), ...payload }, ...s.books] } : s)));
  }

  function toggleBookFinished(sealId, bookId) {
    setSeals((prev) =>
      prev.map((s) => {
        if (s.id !== sealId) return s;
        const books = s.books.map((b) => (b.id === bookId ? { ...b, finished: !b.finished } : b));
        return { ...s, books };
      })
    );
  }

  function removeBook(sealId, bookId) {
    setSeals((prev) => prev.map((s) => (s.id === sealId ? { ...s, books: s.books.filter((b) => b.id !== bookId) } : s)));
  }

  function gildSeal(sealId, note) {
    const year = String(new Date().getFullYear());
    setSeals((prev) =>
      prev.map((s) => {
        if (s.id !== sealId) return s;
        const current = s.gildsByYear?.[year] || 0;
        const gildsByYear = { ...(s.gildsByYear || {}), [year]: current + 1 };
        const gildHistory = [{ id: uid("g"), year, date: todayISO(), note: note?.trim() || undefined }, ...(s.gildHistory || [])];
        return { ...s, gildsByYear, gildHistory };
      })
    );
  }

  function resetTriumphs(sealId) {
    setSeals((prev) => prev.map((s) => (s.id === sealId ? { ...s, triumphs: s.triumphs.map((t) => ({ ...t, done: false })) } : s)));
  }

  function addTriumph(sealId, text, tier) {
    const cleaned = text.trim();
    if (!cleaned) return;
    setSeals((prev) => prev.map((s) => (s.id === sealId ? { ...s, triumphs: [...s.triumphs, { id: uid("t"), text: cleaned, tier, done: false }] } : s)));
  }

  function removeTriumph(sealId, triumphId) {
    setSeals((prev) => prev.map((s) => (s.id === sealId ? { ...s, triumphs: s.triumphs.filter((t) => t.id !== triumphId) } : s)));
  }

  function addSeal(seal) {
    setSeals((prev) => [seal, ...prev]);
    setActiveId(seal.id);
  }

  function deleteSeal(sealId) {
    setSeals((prev) => prev.filter((s) => s.id !== sealId));
    if (activeId === sealId) {
      const next = seals.find((s) => s.id !== sealId);
      if (next) setActiveId(next.id);
    }
  }

  if (!active) return null;

  const palette = PALETTES[active.palette] || PALETTES.ember;
  const completion = calcCompletion(active);
  const earned = completion.total > 0 && completion.done === completion.total;
  const year = String(new Date().getFullYear());
  const gildCountThisYear = active.gildsByYear?.[year] || 0;
  const ActiveIcon = iconFor(active.icon);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(255,255,255,0.05),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.0),rgba(0,0,0,0.75))]" />
      </div>

      <div className="relative z-10 sticky top-0 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-2xl p-2 bg-white/5 border border-white/10">
              <Trophy className="w-5 h-5 text-white/85" />
            </div>
            <div>
              <div className="text-sm text-white/60">Reading Seals</div>
              <div className="font-semibold leading-tight">Track • Earn • Gild</div>
            </div>
          </div>

          <div className="flex-1" />

          <div className="hidden md:flex items-center gap-2 w-[360px]">
            <div className="flex items-center gap-2 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
              <Search className="w-4 h-4 text-white/60" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search seals…" className="w-full bg-transparent outline-none text-sm placeholder:text-white/40" />
            </div>
          </div>

          <button onClick={() => setShowNewSeal(true)} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm">
            <Plus className="w-4 h-4" /> New Seal
          </button>

          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-sm">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        <div className="space-y-3">
          <div className="md:hidden">
            <div className="flex items-center gap-2 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
              <Search className="w-4 h-4 text-white/60" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search seals…" className="w-full bg-transparent outline-none text-sm placeholder:text-white/40" />
            </div>
          </div>

          <div className="rounded-2xl bg-white/3 border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm text-white/70">Seals</div>
              <Pill className="bg-white/5 border-white/10 text-white/70">{filteredSeals.length}</Pill>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              {filteredSeals.map((s) => {
                const c = calcCompletion(s);
                const isActive = s.id === activeId;
                const pal = PALETTES[s.palette] || PALETTES.ember;
                const isEarned = c.total > 0 && c.done === c.total;
                const thisYear = String(new Date().getFullYear());
                const g = s.gildsByYear?.[thisYear] || 0;

                return (
                  <button key={s.id} onClick={() => setActiveId(s.id)} className={"w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition " + (isActive ? "bg-white/6" : "")}>
                    <div className="flex items-start gap-3">
                      <div className={"rounded-2xl p-2 border border-white/10 bg-gradient-to-br " + pal.bg}>
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Emblem paletteKey={s.palette} seed={s.id} size={44} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold truncate">{s.title}</div>
                          <div className="flex items-center gap-2">
                            {g > 0 ? (
                              <Pill className="bg-white/5 border-white/10 text-white/80"><Crown className="w-3.5 h-3.5" />x{g}</Pill>
                            ) : null}
                            {isEarned ? (
                              <Pill className="bg-amber-500/15 border-amber-300/25 text-amber-100"><Check className="w-3.5 h-3.5" />Earned</Pill>
                            ) : (
                              <Pill className="bg-white/5 border-white/10 text-white/70">{c.done}/{c.total}</Pill>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-white/55 truncate">{s.theme}</div>
                        <div className="mt-2"><ProgressBar pct={c.pct} /></div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white/3 border border-white/10 p-4">
            <div className="text-sm text-white/70">Quick tips</div>
            <div className="mt-2 text-sm text-white/55 leading-relaxed">
              Create seals around themes (discipleship, theology, classics). Earn the title by completing Triumphs. Then gild each year for repeatable prestige.
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={"rounded-3xl overflow-hidden border border-white/10 shadow-2xl " + palette.glow}>
            <div className={"p-5 bg-gradient-to-br " + palette.bg}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-3xl border border-white/12 bg-black/30 p-3">
                    <Emblem paletteKey={active.palette} seed={active.id} size={84} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold tracking-tight">{active.title}</div>
                      {earned ? <Pill className="bg-amber-500/15 border-amber-300/25 text-amber-100"><Check className="w-3.5 h-3.5" /> Earned</Pill> : null}
                      {gildCountThisYear > 0 ? <Pill className="bg-white/5 border-white/10 text-white/85"><Crown className="w-3.5 h-3.5" /> Gilded x{gildCountThisYear} ({year})</Pill> : null}
                    </div>
                    <div className="text-sm text-white/70">{active.theme}</div>
                    <div className="mt-2 text-sm text-white/60 max-w-2xl leading-relaxed">{active.flavor}</div>
                  </div>
                </div>

                <div className="flex-1" />

                <div className="w-full md:w-[320px] space-y-2">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Completion</span>
                    <span>{completion.done}/{completion.total} • {completion.pct}%</span>
                  </div>
                  <ProgressBar pct={completion.pct} />
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => resetTriumphs(active.id)} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-black/30 border border-white/10 hover:bg-black/40 text-sm" title="Reset all Triumph checkboxes">
                      <RefreshCcw className="w-4 h-4" /> Reset
                    </button>
                    <button
                      onClick={() => gildSeal(active.id)}
                      disabled={!earned}
                      className={"inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm border " + (earned ? "bg-amber-500/15 border-amber-300/25 hover:bg-amber-500/20" : "bg-white/5 border-white/10 text-white/40 cursor-not-allowed")}
                      title={earned ? "Gild this seal" : "Complete all Triumphs to gild"}
                    >
                      <Crown className="w-4 h-4" /> Gild
                    </button>
                    <button onClick={() => deleteSeal(active.id)} className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-black/30 border border-white/10 hover:bg-black/40 text-sm" title="Delete seal">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {active.earnedOn ? (
                    <div className="text-xs text-white/55">Title earned on <span className="text-white/80">{active.earnedOn}</span></div>
                  ) : (
                    <div className="text-xs text-white/55">Earn the title by completing all Triumphs.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 bg-black/35 backdrop-blur-sm">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <TriumphPanel seal={active} palette={palette} onToggle={toggleTriumph} onAddTriumph={addTriumph} onRemoveTriumph={removeTriumph} />
                <BooksPanel seal={active} palette={palette} onAddBook={addBook} onToggleFinished={toggleBookFinished} onRemoveBook={removeBook} />
              </div>

              <div className="mt-5"><GildHistoryPanel seal={active} palette={palette} /></div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/3 border border-white/10 p-5">
            <SectionTitle
              icon={ActiveIcon}
              title="Your Title"
              subtitle="Use this like a Destiny title: identity + momentum."
              right={<Pill className={palette.chip}><span className="opacity-75">Title:</span> {active.title}</Pill>}
            />
            <div className="mt-3 text-sm text-white/60 leading-relaxed">
              When this seal is earned, treat it like a title you carry: update your notes header, a lock-screen widget, or a Notion dashboard. Gilding marks repeatable mastery each year.
            </div>
          </div>
        </div>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <NewSealModal open={showNewSeal} onClose={() => setShowNewSeal(false)} onCreate={addSeal} />

      <footer className="relative z-10 max-w-6xl mx-auto px-4 pb-10 pt-2 text-xs text-white/45">
        Destiny-inspired structure (seals + gilding), but all visuals are original. Data is stored locally in your browser.
      </footer>
    </div>
  );
}
