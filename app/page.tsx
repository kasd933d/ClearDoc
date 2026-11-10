"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "../src/lib/languages";

const NAME = "ClearDoc";

const STEPS = [
  { no: "01", title: "Snap", text: "Take a photo of any bill, notice, form or report. PDFs work too." },
  { no: "02", title: "Choose", text: "Pick the language you understand best." },
  { no: "03", title: "Read", text: "Get a short, simple explanation and the key details." },
  { no: "04", title: "Listen", text: "Tap once and hear it read aloud, in your language." },
];

const EXAMPLES = [
  {
    type: "BILL",
    before:
      "Pursuant to the terms herein, failure to remit the outstanding balance prior to the stipulated due date shall result in the imposition of a surcharge.",
    after: "Pay your bill before the due date. If you pay late, you will be charged extra.",
  },
  {
    type: "MEDICAL REPORT",
    before:
      "The patient is advised to undergo a follow-up evaluation within fourteen days to reassess the aforementioned condition.",
    after: "Go back to the doctor after 2 weeks for a check-up.",
  },
  {
    type: "NOTICE",
    before:
      "You are hereby directed to appear in person before the competent authority on the date specified in the schedule below.",
    after: "You must go to the office in person on the date written in this letter.",
  },
];

// Har zaban ka voice code (browser ki awaaz isi code se dhundi jati hai)
const LANG_CODES: Record<string, string> = {
  Urdu: "ur-PK",
  "Roman Urdu": "en-IN",
  Hindi: "hi-IN",
  English: "en-US",
  Punjabi: "pa-IN",
  Sindhi: "sd-PK",
  Pashto: "ps-AF",
  Arabic: "ar-SA",
  Bengali: "bn-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Gujarati: "gu-IN",
  Marathi: "mr-IN",
  Persian: "fa-IR",
  Turkish: "tr-TR",
  Indonesian: "id-ID",
  Swahili: "sw-KE",
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Portuguese: "pt-PT",
  Russian: "ru-RU",
  Chinese: "zh-CN",
  Japanese: "ja-JP",
  Korean: "ko-KR",
};

type Result = {
  doc_type: string;
  summary: string;
  key_details: { label: string; value: string }[];
  actions: string[];
  warning: string;
};

// PDF ko base64 text mein badalta hai taake server ko bheja ja sake
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

// Photo ko chhota karta hai (max 1600px) taake bhejna tez aur halka ho
function resizeImage(file: File, maxSize = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not read the photo."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
    };
    img.onerror = () => reject(new Error("Could not read the photo."));
    img.src = URL.createObjectURL(file);
  });
}

// Kisi bhi cheez ko scroll par neeche se upar slide karke dikhata hai
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${show ? "show" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Number 0 se upar tak ginta hai jab screen par aata hai
function CountUp({ to, motionOff }: { to: number; motionOff: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (motionOff) {
          setN(to);
          return;
        }
        const start = performance.now();
        const duration = 1400;
        const tick = (t: number) => {
          const p = Math.min((t - start) / duration, 1);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, motionOff]);

  return <span ref={ref}>{n}</span>;
}

// "Letter kya kehta hai" vs "ClearDoc kya kehta hai", typing animation ke saath
function BeforeAfter({ motionOff }: { motionOff: boolean }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const ex = EXAMPLES[i];

  useEffect(() => {
    const full = EXAMPLES[i].after;
    if (motionOff) {
      setTyped(full);
      return;
    }
    setTyped("");
    let k = 0;
    const t = setInterval(() => {
      k++;
      setTyped(full.slice(0, k));
      if (k >= full.length) clearInterval(t);
    }, 28);
    return () => clearInterval(t);
  }, [i, motionOff]);

  useEffect(() => {
    if (motionOff) return;
    const id = setInterval(() => setI((x) => (x + 1) % EXAMPLES.length), 7000);
    return () => clearInterval(id);
  }, [motionOff]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6" role="group" aria-label="Choose an example">
        {EXAMPLES.map((e, idx) => (
          <button
            key={e.type}
            onClick={() => setI(idx)}
            aria-pressed={i === idx}
            className={`font-mono text-xs tracking-widest rounded-full px-4 py-2 border focus:outline-none focus:ring-4 focus:ring-[#3de0c3]/40 ${
              i === idx
                ? "bg-[#3de0c3] text-[#04110e] border-[#3de0c3]"
                : "border-white/25 text-[#eaf0ff] hover:border-[#3de0c3]"
            }`}
          >
            {e.type}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-white/15 bg-[#121a30] p-6 md:p-8">
          <p className="font-mono text-xs tracking-widest text-[#a9b4d0] mb-4">THE LETTER SAYS</p>
          <p className="text-xl leading-relaxed text-[#a9b4d0] font-serif">{ex.before}</p>
        </div>
        <div className="rounded-3xl border border-[#3de0c3]/60 bg-[#0e2a2c] p-6 md:p-8">
          <p className="font-mono text-xs tracking-widest text-[#3de0c3] mb-4">CLEARDOC SAYS</p>
          <p className="text-2xl leading-relaxed min-h-24">
            <span className="sr-only">{ex.after}</span>
            <span aria-hidden="true" className={typed.length < ex.after.length ? "caret" : ""}>
              {typed}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // ---- Loader (0 se 100 tak ginti) ----
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= 100) {
          clearInterval(id);
          return 100;
        }
        return c + 4;
      });
    }, 40);
    return () => clearInterval(id);
  }, []);
  const loaded = count >= 100;

  // ---- Pause motion (jin ko animation se chakkar aate hain) ----
  const [motionOff, setMotionOff] = useState(false);

  // ---- Scroll progress bar ----
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? window.scrollY / h : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---- Upload tool ----
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState("Urdu");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(selected.type === "application/pdf" ? null : URL.createObjectURL(selected));
    setResult(null);
    setError(null);
  }

  // ---- Voice (Sunao) ----
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const [resultLang, setResultLang] = useState("Urdu");

  // Browser ki awaazen dheere dheere load hoti hain, isliye unka intezaar karte hain
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  // Result ko ek lambi baat mein badalta hai jo awaaz parh sake
  function buildSpeech(r: Result) {
    const parts: string[] = [r.summary];
    r.key_details?.forEach((d) => parts.push(`${d.label}: ${d.value}`));
    r.actions?.forEach((a, i) => parts.push(`${i + 1}. ${a}`));
    if (r.warning) parts.push(r.warning);
    return parts.join(". ");
  }

  function speak() {
    if (!result) return;
    if (!("speechSynthesis" in window)) {
      setVoiceMsg("This browser cannot read aloud. Please try Chrome or Edge.");
      return;
    }
    window.speechSynthesis.cancel();

    const code = LANG_CODES[resultLang] ?? "en-US";
    const base = code.split("-")[0].toLowerCase();
    const norm = (l: string) => l.replace("_", "-").toLowerCase();
    const voice =
      voices.find((v) => norm(v.lang) === code.toLowerCase()) ??
      voices.find((v) => norm(v.lang).startsWith(base));

    if (!voice) {
      setVoiceMsg(
        `No ${resultLang} voice was found on this device. Try Chrome on Android or Microsoft Edge, or choose another language.`
      );
      return;
    }
    setVoiceMsg(null);

    // Lambi baat ko jumlon mein torte hain, warna kuch browsers beech mein ruk jate hain
    const chunks = buildSpeech(result)
      .split(/(?<=[.!?\u06D4\u061F])\s+/)
      .filter((c) => c.trim().length > 0);

    chunks.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.9;
      if (i === 0) u.onstart = () => setSpeaking(true);
      if (i === chunks.length - 1) u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    });
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  // Sab kuch saaf: file, preview, jawab, error aur awaaz
  function clearAll() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setVoiceMsg(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function explain() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setVoiceMsg(null);
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const isPdf = file.type === "application/pdf";
      if (isPdf && file.size > 3 * 1024 * 1024) {
        throw new Error("This PDF is too big. Please use a PDF under 3 MB.");
      }
      const image = isPdf ? await fileToBase64(file) : await resizeImage(file);

      const res = await fetch("/api/explain", {
        method: "POST",
        signal: AbortSignal.timeout(60000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          mimeType: isPdf ? "application/pdf" : "image/jpeg",
          language,
        }),
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Server sent an unexpected page (status ${res.status}). Please check the terminal.`
        );
      }
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
      setResultLang(language);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-motion={motionOff ? "off" : "on"}
      className="bg-[#070b16] text-[#eaf0ff] overflow-x-hidden"
    >
      {/* SKIP LINK (keyboard walon ke liye) */}
      <a
        href="#try"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-[#3de0c3] focus:text-[#04110e] focus:px-4 focus:py-2 focus:rounded-lg font-semibold"
      >
        Skip to the tool
      </a>

      {/* SCROLL PROGRESS */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-1 z-40 origin-left bg-gradient-to-r from-[#3de0c3] to-[#ffb547]"
        style={{ transform: `scaleX(${progress})` }}
      />

      {/* LOADER */}
      <div
        aria-hidden={loaded}
        className={`fixed inset-0 z-50 bg-[#070b16] flex flex-col justify-between p-6 font-mono text-sm tracking-widest transition-[opacity,visibility] duration-700 ${
          loaded ? "opacity-0 invisible pointer-events-none" : ""
        }`}
      >
        <div className="flex justify-between items-center">
          <span>CLEARDOC</span>
          <button
            onClick={() => setCount(100)}
            className="border border-white/25 rounded-full px-4 py-2 hover:border-[#3de0c3] focus:outline-none focus:ring-4 focus:ring-[#3de0c3]/40"
          >
            SKIP
          </button>
        </div>
        <div className="flex items-end justify-between">
          <span>LOADING</span>
          <span className="text-7xl font-black text-grad">{count}%</span>
        </div>
      </div>

      {/* NAV */}
      <nav className="fixed top-1 inset-x-0 z-30 flex items-center justify-between px-6 py-4 font-mono text-xs tracking-widest backdrop-blur-md bg-[#070b16]/60">
        <span>CLEARDOC / V1</span>
        <div className="flex items-center gap-5">
          <button
            onClick={() => setMotionOff((m) => !m)}
            aria-pressed={motionOff}
            className="border border-white/25 rounded-full px-4 py-2 hover:border-[#3de0c3] focus:outline-none focus:ring-4 focus:ring-[#3de0c3]/40"
          >
            {motionOff ? "PLAY MOTION" : "PAUSE MOTION"}
          </button>
          <a
            href="#try"
            className="underline underline-offset-4 focus:outline-none focus:ring-4 focus:ring-[#3de0c3]/40 rounded"
          >
            TRY IT ↓
          </a>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="relative min-h-screen flex flex-col justify-between px-6 pt-28 pb-8 overflow-hidden">
          <div aria-hidden="true" className="blob bg-[#3de0c3] w-[45vw] h-[45vw] -top-24 -left-24" />
          <div
            aria-hidden="true"
            className="blob bg-[#ffb547] w-[32vw] h-[32vw] bottom-0 right-0"
            style={{ animationDelay: "-6s" }}
          />
          <div aria-hidden="true" className="grid-bg absolute inset-0" />

          <div className="relative">
            <p className="font-mono text-xs tracking-widest text-[#3de0c3] mb-4">
              ● DOCUMENT EXPLAINER · 25 LANGUAGES
            </p>
            <h1
              aria-label={NAME}
              className="text-[20vw] md:text-[15vw] font-black tracking-tighter leading-[0.95] pb-2 overflow-hidden"
            >
              {NAME.split("").map((ch, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`letter ${i >= 5 ? "text-grad" : ""}`}
                  style={{ animationDelay: `${1100 + i * 80}ms` }}
                >
                  {ch}
                </span>
              ))}
            </h1>
          </div>

          <div className="relative grid md:grid-cols-2 gap-10 items-end mt-10">
            <div>
              <p className="text-2xl md:text-3xl max-w-xl">
                Understand any bill, notice or form.{" "}
                <span className="font-serif italic text-[#3de0c3]">In your language.</span>
              </p>
              <p className="text-lg text-[#a9b4d0] mt-4 max-w-lg">
                Upload a photo or PDF. ClearDoc explains it in simple words, tells you what to do
                next, and reads it aloud.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                <a
                  href="#try"
                  className="bg-[#3de0c3] text-[#04110e] text-xl font-bold rounded-2xl px-8 py-4 min-h-14 focus:outline-none focus:ring-4 focus:ring-white transition-transform hover:scale-105"
                >
                  Try it now
                </a>
                <a
                  href="#how"
                  className="border-2 border-white/30 text-xl font-semibold rounded-2xl px-8 py-4 min-h-14 focus:outline-none focus:ring-4 focus:ring-[#3de0c3]/50 hover:border-[#3de0c3] transition-colors"
                >
                  How it works
                </a>
              </div>
            </div>

            {/* Chalta hua "scan" wala nakli document (sirf sajawat) */}
            <div
              aria-hidden="true"
              className="relative mx-auto w-full max-w-md rounded-3xl border border-white/15 bg-[#121a30] p-6 overflow-hidden"
            >
              <div className="scan-line" />
              <div className="flex justify-between font-mono text-[11px] tracking-widest text-[#a9b4d0] mb-5">
                <span>DOC·01 BILL</span>
                <span>EXAMPLE</span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="ink w-3/4" />
                <div className="ink w-full" />
                <div className="ink w-5/6" />
                <div className="ink w-2/3" />
                <div className="ink w-full" />
                <div className="ink w-1/2" />
              </div>
              <div className="clear-chip mt-6 rounded-2xl bg-[#3de0c3] text-[#04110e] p-4 font-semibold">
                ✓ Pay your bill before the due date.
              </div>
            </div>
          </div>

          <div className="relative flex justify-between font-mono text-xs tracking-widest text-[#a9b4d0] mt-10">
            <span>FREE · NO LOGIN</span>
            <span>SCROLL TO EXPLORE ↓</span>
          </div>
        </section>

        {/* LANGUAGES MARQUEE (do patti, ulti taraf) */}
        <div className="border-y border-white/15 py-5 overflow-hidden" aria-hidden="true">
          <div className="marquee-track text-3xl md:text-5xl font-black">
            {[...LANGUAGES, ...LANGUAGES].map((l, i) => (
              <span key={i} className="px-6 whitespace-nowrap">
                {l.label} <span className="text-[#3de0c3]">✦</span>
              </span>
            ))}
          </div>
          <div className="marquee-track marquee-reverse text-xl md:text-3xl font-semibold text-[#a9b4d0] mt-4">
            {[...LANGUAGES, ...LANGUAGES].reverse().map((l, i) => (
              <span key={i} className="px-6 whitespace-nowrap">
                {l.name} <span className="text-[#ffb547]">●</span>
              </span>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section id="how" className="px-6 py-28 max-w-6xl mx-auto">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-[#3de0c3] mb-4">01 / HOW IT WORKS</p>
            <h2 className="text-5xl md:text-7xl font-black tracking-tight">
              Four steps. One{" "}
              <span className="font-serif italic text-[#3de0c3]">clear</span> answer.
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {STEPS.map((s, i) => (
              <Reveal key={s.no} delay={i * 120}>
                <div className="group h-full rounded-3xl border border-white/15 bg-[#121a30] p-6 transition-all duration-300 hover:-translate-y-2 hover:border-[#3de0c3] hover:shadow-[0_0_40px_-10px_rgba(61,224,195,0.6)]">
                  <p className="font-mono text-xs tracking-widest text-[#a9b4d0]">
                    {s.no} / 04
                  </p>
                  <h3 className="text-4xl font-black mt-6 group-hover:text-[#3de0c3] transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-lg mt-3 text-[#a9b4d0]">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section className="px-6 pb-28 max-w-6xl mx-auto">
          <Reveal>
            <div className="grid sm:grid-cols-3 border-y border-white/15 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
              {[
                { n: 25, label: "languages to explain in" },
                { n: 2, label: "file types: photo and PDF" },
                { n: 1, label: "tap to listen" },
              ].map((s) => (
                <div key={s.label} className="py-10 sm:px-8">
                  <p className="text-7xl md:text-8xl font-black text-grad">
                    <CountUp to={s.n} motionOff={motionOff} />
                  </p>
                  <p className="font-mono text-xs tracking-widest text-[#a9b4d0] mt-3 uppercase">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* BEFORE / AFTER */}
        <section className="px-6 pb-28 max-w-6xl mx-auto">
          <Reveal>
            <p className="font-mono text-xs tracking-widest text-[#3de0c3] mb-4">02 / THE DIFFERENCE</p>
            <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-12">
              From confusing to{" "}
              <span className="font-serif italic text-[#3de0c3]">clear.</span>
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <BeforeAfter motionOff={motionOff} />
          </Reveal>
        </section>

        {/* TRY IT */}
        <section id="try" className="px-6 py-28 bg-[#0d1426] border-t border-white/10">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <Reveal>
              <p className="font-mono text-xs tracking-widest text-[#3de0c3] mb-4">03 / TRY IT</p>
              <h2 className="text-5xl md:text-7xl font-black tracking-tight">
                Try it <span className="font-serif italic text-[#ffb547]">now.</span>
              </h2>
              <p className="text-lg text-[#a9b4d0] mt-4">
                This is a demo. Please do not upload documents with private information.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="flex flex-col gap-2">
                <label htmlFor="language" className="text-xl font-semibold">
                  Explain in:
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xl bg-[#eaf0ff] text-[#070b16] border-2 border-[#eaf0ff] rounded-xl p-4 min-h-14 focus:outline-none focus:ring-4 focus:ring-[#3de0c3]"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </Reveal>

            <Reveal delay={250}>
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-block bg-[#3de0c3] text-[#04110e] text-2xl font-bold rounded-2xl px-8 py-5 min-h-14 cursor-pointer focus-within:ring-4 focus-within:ring-white transition-transform hover:scale-105">
                  Choose a photo or PDF
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFile}
                    className="sr-only"
                  />
                </label>

                {(file || result || error) && (
                  <button
                    onClick={clearAll}
                    disabled={loading}
                    className="border-2 border-white/60 text-2xl font-semibold rounded-2xl px-8 py-5 min-h-14 focus:outline-none focus:ring-4 focus:ring-white transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
                  >
                    Clear
                  </button>
                )}
              </div>
            </Reveal>

            {file && (
              <>
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview of your uploaded document"
                    className="max-h-80 w-fit rounded-xl border-2 border-white/40"
                  />
                ) : (
                  <p className="border-2 border-white/40 rounded-xl p-4 text-xl w-fit">
                    📄 {file.name}
                  </p>
                )}
                <button
                  onClick={explain}
                  disabled={loading}
                  className="bg-[#ffb547] text-[#1a1200] text-2xl font-bold rounded-2xl px-8 py-5 min-h-14 w-fit focus:outline-none focus:ring-4 focus:ring-white transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
                >
                  {loading ? "Reading your document..." : "Explain it"}
                </button>
              </>
            )}

            <div
              aria-live="polite"
              className="border-2 border-dashed border-white/30 rounded-3xl p-6 text-xl min-h-32 flex flex-col gap-6 bg-[#070b16]/40"
            >
              {loading && <p>Reading your document, please wait...</p>}
              {error && (
                <p role="alert" className="text-[#ffb547] font-semibold">
                  {error}
                </p>
              )}
              {!loading && !error && !result && <p>Your explanation will appear here.</p>}

              {result && (
                <>
                  <p className="font-mono text-xs tracking-widest text-[#3de0c3]">
                    {result.doc_type}
                  </p>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={speaking ? stopSpeaking : speak}
                      aria-label={speaking ? "Stop reading aloud" : "Read the explanation aloud"}
                      className="bg-[#3de0c3] text-[#04110e] text-2xl font-bold rounded-2xl px-6 py-4 min-h-14 w-fit focus:outline-none focus:ring-4 focus:ring-white transition-transform hover:scale-105"
                    >
                      {speaking ? "⏹ Stop" : "🔊 Listen (Sunao)"}
                    </button>
                    {voiceMsg && (
                      <p role="alert" className="text-base text-[#ffb547] font-semibold">
                        {voiceMsg}
                      </p>
                    )}
                  </div>

                  <p dir="auto" className="text-2xl leading-relaxed">
                    {result.summary}
                  </p>

                  {result.key_details?.length > 0 && (
                    <dl className="flex flex-col gap-3">
                      {result.key_details.map((d, i) => (
                        <div key={i} className="border-b border-white/15 pb-2">
                          <dt dir="auto" className="font-semibold text-[#3de0c3]">
                            {d.label}
                          </dt>
                          <dd dir="auto">{d.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {result.actions?.length > 0 && (
                    <div>
                      <h3 className="text-2xl font-black mb-2">What to do</h3>
                      <ol className="list-decimal ps-6 flex flex-col gap-2 marker:text-[#3de0c3] marker:font-bold">
                        {result.actions.map((a, i) => (
                          <li key={i} dir="auto">
                            {a}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {result.warning && (
                    <p
                      dir="auto"
                      className="bg-[#ffb547] text-[#1a1200] font-semibold rounded-xl p-4"
                    >
                      ⚠ {result.warning}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative px-6 py-24 text-center overflow-hidden">
        <div aria-hidden="true" className="blob bg-[#3de0c3] w-[40vw] h-[40vw] -bottom-40 left-1/4" />
        <div className="relative">
          <p className="font-mono text-xs tracking-widest text-[#a9b4d0]">
            BUILT FOR THE CTRL-V HACKATHON
          </p>
          <h2 className="text-5xl md:text-8xl font-black tracking-tight mt-6">
            Clear.{" "}
            <span className="font-serif italic text-grad">Not complicated.</span>
          </h2>
          <a
            href="#"
            className="inline-block mt-10 font-mono text-xs tracking-widest underline underline-offset-4 focus:outline-none focus:ring-4 focus:ring-[#3de0c3]/40 rounded"
          >
            BACK TO TOP ↑
          </a>
        </div>
      </footer>
    </div>
  );
}