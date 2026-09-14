import React, { useState, useEffect, useCallback } from "react";
import { clearState, loadState, makeBagCheckState, getTodayBagCheck, saveState } from "./localBackend.js";
import { shareBagCheckCard } from "./shareCard.js";
import {
  MONEY_TYPES, QUIZ, PLAYBOOKS, LESSONS, GOAL_OPTIONS, GOAL_PLAYBOOKS,
  GOAL_CARD_AGE, MILESTONES, TYPE_CARDS, WILDCARDS, GOAL_CARDS,
} from "./content.js";
import {
  Home, Settings as SettingsIcon, ChevronLeft, ChevronRight, Check, X, Sparkles,
  TrendingUp, TrendingDown, Lock, Share2, Award, DollarSign, ArrowRight, Star,
  ShieldCheck, FileText, Wallet, Flame, Trophy, RotateCcw, ArrowLeft, CreditCard,
  Calendar, Bell, HelpCircle, Zap, BookOpen, Lightbulb, Users, MessageCircle,
  Wrench, Search, Rocket, LineChart, Activity, PiggyBank, BadgeCheck, Compass, Archive,
} from "lucide-react";

/* ============================================================================
   THE BAG — frontend prototype
   Palette: a coastal navy/teal/blue system, adapted from a brand reference —
   ONE consistent signature accent (a bright coastal blue) used everywhere for
   brand moments — CTAs, highlights, active states, unlocked states — the way
   BitLife leans on a single signature green throughout its UI, rather than a
   different color per section. It sits on a cool off-white neutral base with
   deep-navy structural chrome (nav, buttons, hero cards) doubling as the
   darkest shade of the same accent family. Teal is kept as one deliberate
   secondary accent for the personalized Goal Playbook only. A small semantic
   set (green/red-orange/gold-band colors) is reserved strictly for financial
   meaning — positive, negative, and Bag Score bands — never used decoratively.
   Two-font system: Space Grotesk (display / all money numbers) + Plus Jakarta
   Sans (body). Signature interactions: swipeable Decision Cards, printed
   Receipts, and a guided Research flow that gates Playbook/Lesson completion.
   Onboarding also captures a money goal, which seeds one personalized
   "Goal Playbook" on top of the shared content.
   ============================================================================ */

const T = {
  primary: "#349AFF",     // the one signature accent — a bright coastal blue, used consistently everywhere
  primaryDeep: "#0A2E5D", // deep navy — darkest shade of the same accent family
  primarySoft: "#D6ECFF", // light tint of the same accent, for soft fills / high-contrast pops on dark cards
  cream: "#F6FAFD",
  cream2: "#EAF2F8",
  ink: "#0A2E5D",         // body text — the same deep navy, not a separate neutral
  inkSoft: "#4E7191",
  line: "#D7E6F0",
  green: "#1E9E6B",       // semantic only: positive money outcome
  greenSoft: "#DFF3E9",
  redOrange: "#E2603A",   // semantic only: negative / consequence
  redOrangeSoft: "#FCE3D8",
  teal: "#27C6D9",        // one deliberate secondary accent, reserved for the Goal Playbook
  white: "#FFFFFF",
  black: "#0A2E5D",       // structural: buttons, nav, hero cards — same navy as primaryDeep/ink
};

const FONT_DISPLAY = "'Space Grotesk', 'Segoe UI', system-ui, sans-serif";
const FONT_BODY = "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif";

/* Content (Money Types, decks, Playbooks) lives in content/game.json — loaded via content.js. */

function getLessonMeta(key) {
  if (PLAYBOOKS[key]) return { ...PLAYBOOKS[key], key, kind: "playbook" };
  if (GOAL_PLAYBOOKS[key]) return { ...GOAL_PLAYBOOKS[key], key, kind: "goal" };
  if (LESSONS[key]) return { ...LESSONS[key], key, kind: "lesson" };
  return { name: key, icon: BookOpen, kind: "lesson", research: { headline: "", points: [], tip: "" } };
}

const kindWord = (kind) => (kind === "lesson" ? "Lesson mastered" : kind === "goal" ? "Goal Playbook unlocked" : "Playbook unlocked");
const kindEyebrowUnlock = (kind) => (kind === "lesson" ? "LESSON MASTERED" : kind === "goal" ? "GOAL PLAYBOOK UNLOCKED" : "PLAYBOOK UNLOCKED");
const kindEyebrowResearch = (kind) => (kind === "lesson" ? "QUICK LESSON" : kind === "goal" ? "YOUR GOAL PLAYBOOK" : "PLAYBOOK RESEARCH");
// The featured, personalized Goal Playbook gets the one deliberate secondary
// accent (gold); every other Playbook/Lesson uses the same signature accent,
// just as a soft tint, so "the app's color" always reads as one color.
const kindAccent = (kind) => (kind === "goal" ? T.teal : T.primarySoft);

const MOCK_LEADERBOARD = [
  { name: "Zoe", score: 780 },
  { name: "Ruby", score: 742 },
  { name: "Ivy", score: 705 },
  { name: "Nora", score: 668 },
  { name: "Mia", score: 634 },
  { name: "Sage", score: 601 },
  { name: "Lily", score: 572 },
  { name: "Ava", score: 540 },
];

const SKIN_TONES = ["#F6D3B3", "#E9B78C", "#C98B5E", "#9C6240", "#6B4028"];
const HAIR_COLORS = ["#2B1B18", "#6B3E22", "#B5651D", "#D9A441", "#7A5C99"];
const OUTFIT_COLORS = [T.primary, T.green, "#3B6EA5", T.teal, "#7A5C99", T.redOrange];
const HAIR_STYLES = ["bob", "long", "curly"];

const LIFE_STAGE = (age) => {
  if (age < 16) return "High School";
  if (age < 18) return "First Job Era";
  if (age < 20) return "Moving Out";
  if (age < 22) return "Building Credit";
  if (age < 24) return "Career Growth";
  if (age < 26) return "Adulting";
  return "Life Complete";
};

const bandForScore = (s) => {
  if (s < 580) return { label: "Building", color: T.redOrange };
  if (s < 670) return { label: "Fair", color: "#D9A441" };
  if (s < 740) return { label: "Good", color: "#6FBF8A" };
  if (s < 800) return { label: "Very Good", color: T.green };
  return { label: "Excellent", color: T.green };
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;
const sideChoice = (card, side) => {
  if (side === "tool") return card.tool;
  return side === "left" ? card.left : card.right;
};

function withPlaybookTool(card, ledger) {
  if (!card) return card;
  const toolAvailable = !!(card.tool && ledger?.playbooks?.[card.tool.requires]);
  return { ...card, toolAvailable };
}

function tryCompleteLearning(ledgerIn, card, chosenSide) {
  const meta = getLessonMeta(card.lessonKey);
  const bucketKey = meta.kind === "lesson" ? "lessons" : "playbooks";
  const isSmart = chosenSide === card.smartSide || chosenSide === "tool";
  const alreadyDone = ledgerIn[bucketKey][card.lessonKey];
  const researched = ledgerIn.researchedLessons[card.lessonKey];
  if (!isSmart || alreadyDone || !researched) return { ledger: ledgerIn, unlockedName: null, meta };
  return {
    ledger: { ...ledgerIn, [bucketKey]: { ...ledgerIn[bucketKey], [card.lessonKey]: true } },
    unlockedName: meta.name, meta,
  };
}

/* ---------------------------------------------------------------------------
   SMALL PRESENTATIONAL PIECES
--------------------------------------------------------------------------- */

function Highlight({ children, bg, color }) {
  return (
    <span style={{ background: bg, color: color, borderRadius: 8, padding: "1px 9px", display: "inline-block" }}>
      {children}
    </span>
  );
}

function Avatar({ av, size = 96 }) {
  const hairColor = av.hairColor;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="54" r="30" fill={av.skin} />
      {av.hairStyle === "bob" && (
        <path d="M20 46 Q20 14 50 14 Q80 14 80 46 L80 40 Q80 30 50 30 Q20 30 20 40 Z" fill={hairColor} />
      )}
      {av.hairStyle === "long" && (
        <path d="M18 46 Q16 10 50 10 Q84 10 82 46 L82 78 Q76 60 76 40 Q76 26 50 26 Q24 26 24 40 Q24 60 18 78 Z" fill={hairColor} />
      )}
      {av.hairStyle === "curly" && (
        <g fill={hairColor}>
          <circle cx="26" cy="30" r="9" /><circle cx="38" cy="20" r="10" />
          <circle cx="52" cy="17" r="10" /><circle cx="66" cy="20" r="10" />
          <circle cx="76" cy="32" r="9" /><path d="M22 40 Q22 30 50 28 Q78 30 78 40 L78 36 Q50 24 22 36 Z" />
        </g>
      )}
      <circle cx="40" cy="56" r="2.4" fill={T.ink} />
      <circle cx="60" cy="56" r="2.4" fill={T.ink} />
      <path d="M42 66 Q50 71 58 66" stroke={T.ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M14 100 Q14 78 50 78 Q86 78 86 100 Z" fill={av.outfit} />
    </svg>
  );
}

function Pill({ icon: Icon, children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: T.cream2, fg: T.ink },
    // fg is a darker green than T.green specifically so pill text clears
    // WCAG AA (4.5:1) on the soft green background, not just the 3:1 floor.
    green: { bg: T.greenSoft, fg: "#0A6B44" },
    // fg is a darker red-orange than T.redOrange so pill text clears
    // WCAG AA (4.5:1) on the soft background, not just the 3:1 floor.
    red: { bg: T.redOrangeSoft, fg: "#A83E1B" },
    primary: { bg: T.primarySoft, fg: T.primaryDeep },
  };
  const c = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, background: c.bg, color: c.fg,
      padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY,
    }}>
      {Icon && <Icon size={14} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, icon: Icon, style, disabled }) {
  const BadgeIcon = Icon || ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#C7D6E3" : T.black,
        color: T.white, border: "none", borderRadius: 999, padding: "6px 6px 6px 22px",
        fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, letterSpacing: 0.2,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        width: "100%", cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 14px 28px -14px rgba(0,0,0,0.5)",
        transition: "transform .12s ease", ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <span>{children}</span>
      <span style={{
        width: 38, height: 38, borderRadius: 999, background: disabled ? "rgba(0,0,0,0.12)" : T.white,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <BadgeIcon size={17} color={disabled ? T.inkSoft : T.black} strokeWidth={2.6} />
      </span>
    </button>
  );
}

function GhostButton({ children, onClick, icon: Icon, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent", color: T.inkSoft, border: `1.5px solid ${T.line}`,
        borderRadius: 999, padding: "14px 20px", fontFamily: FONT_BODY, fontWeight: 700, fontSize: 15,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", cursor: "pointer", ...style,
      }}
    >
      {Icon && <Icon size={16} />} {children}
    </button>
  );
}

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6, height: 6, borderRadius: 4,
          background: i <= current ? T.primary : T.black, transition: "all .25s ease",
        }} />
      ))}
    </div>
  );
}

function BagScoreRing({ score, size = 190 }) {
  const pct = clamp((score - 300) / (850 - 300), 0, 1);
  const band = bandForScore(score);
  const strokeWidth = 16;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const gapLength = circumference - arcLength;
  const progressLength = arcLength * pct;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(135deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${gapLength}`} strokeLinecap="round" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={band.color} strokeWidth={strokeWidth}
          strokeDasharray={`${progressLength} ${circumference - progressLength}`} strokeLinecap="round" />
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 46, color: T.white, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>
          {Math.round(score)}
        </div>
        <span style={{
          display: "inline-flex", marginTop: 8, background: "rgba(255,255,255,0.14)", color: band.color,
          padding: "5px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, fontFamily: FONT_BODY,
        }}>{band.label}</span>
      </div>
    </div>
  );
}

function LessonTag({ meta, researched, onClick }) {
  const kindLabel = meta.kind === "playbook" ? "Playbook" : meta.kind === "goal" ? "Goal Playbook" : "Lesson";
  const accent = kindAccent(meta.kind);

  if (researched) {
    return (
      <button onClick={onClick} style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        background: T.greenSoft, border: "none", borderRadius: 14, padding: "10px 12px", cursor: "pointer",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999, background: "#0A6B44",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Check size={14} color={T.white} strokeWidth={3} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: "#0A6B44", letterSpacing: 0.5 }}>RESEARCHED</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.ink }}>{kindLabel}: {meta.name}</div>
        </div>
      </button>
    );
  }

  // Deliberately a full-width, high-contrast CTA (not a subtle tag) so the
  // research step reads as an obvious, inviting action, not a footnote.
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
      background: accent, border: "none", borderRadius: 14, padding: "11px 12px", cursor: "pointer",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 999, background: "rgba(10,46,93,0.14)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <BookOpen size={15} color={T.black} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: T.black }}>Research to decide</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: "rgba(10,46,93,0.68)" }}>{kindLabel}: {meta.name}</div>
      </div>
      <ChevronRight size={17} color={T.black} strokeWidth={2.5} />
    </button>
  );
}

/* ---------------------------------------------------------------------------
   DECISION CARD — signature swipeable interaction
--------------------------------------------------------------------------- */

function DecisionCardOverlay({ card, onResolve, researched, onResearch }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = React.useRef(0);
  const meta = getLessonMeta(card.lessonKey);

  const commit = (dir) => {
    setDragX(dir === "right" ? 900 : -900);
    setTimeout(() => onResolve(dir), 260);
  };

  const onDown = (e) => {
    setDragging(true);
    startXRef.current = (e.touches ? e.touches[0].clientX : e.clientX);
  };
  const onMove = (e) => {
    if (!dragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    setDragX(x - startXRef.current);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 110) commit("right");
    else if (dragX < -110) commit("left");
    else setDragX(0);
  };

  const rot = dragX / 18;
  const rightGlow = clamp(dragX / 130, 0, 1);
  const leftGlow = clamp(-dragX / 130, 0, 1);

  return (
    <div style={overlayWrapStyle}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: 1, textTransform: "uppercase" }}>Decision Deck</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: T.white, marginTop: 2 }}>{card.title}</div>
      </div>

      <div
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        style={{
          width: "88%", maxWidth: 320, background: T.cream, borderRadius: 26, padding: "24px 22px 24px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.55)", cursor: dragging ? "grabbing" : "grab",
          transform: `translateX(${dragX}px) rotate(${rot}deg)`,
          transition: dragging ? "none" : "transform .28s cubic-bezier(.2,.9,.2,1)",
          touchAction: "none", userSelect: "none", position: "relative",
        }}
      >
        <div style={{
          position: "absolute", top: 18, left: 18, padding: "4px 10px", borderRadius: 8, border: `2px solid ${T.redOrange}`,
          color: T.redOrange, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13, transform: "rotate(-12deg)",
          opacity: leftGlow,
        }}>NAH</div>
        <div style={{
          position: "absolute", top: 18, right: 18, padding: "4px 10px", borderRadius: 8, border: `2px solid ${T.green}`,
          color: T.green, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13, transform: "rotate(12deg)",
          opacity: rightGlow,
        }}>YEAH</div>

        <div style={{ marginTop: 24 }}>
          <LessonTag meta={meta} researched={researched} onClick={onResearch} />
        </div>

        <div style={{ fontFamily: FONT_BODY, fontSize: 16, color: T.ink, lineHeight: 1.5, marginTop: 14 }}>
          {card.prompt}
        </div>

        <div style={{ height: 1, background: T.line, margin: "18px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ minWidth: 22, height: 22, borderRadius: 999, background: T.redOrangeSoft, color: T.redOrange, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <ArrowLeft size={13} strokeWidth={3} />
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14.5, color: T.ink, fontWeight: 600 }}>{card.left.label}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ minWidth: 22, height: 22, borderRadius: 999, background: T.greenSoft, color: T.green, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <ArrowRight size={13} strokeWidth={3} />
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14.5, color: T.ink, fontWeight: 600 }}>{card.right.label}</div>
          </div>
          {card.toolAvailable && (
            <div style={{
              marginTop: 4, background: T.primarySoft, borderRadius: 14, padding: "10px 12px",
              border: `1.5px solid ${T.primary}`,
            }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: T.primaryDeep, letterSpacing: 0.8 }}>PLAYBOOK UNLOCKED</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.ink, fontWeight: 700, marginTop: 4 }}>{card.tool.label}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 22 }}>
        <button onClick={() => commit("left")} style={circleBtnStyle(T.redOrange)}><X size={26} color={T.white} strokeWidth={3} /></button>
        <button onClick={() => commit("right")} style={circleBtnStyle(T.green)}><Check size={26} color={T.white} strokeWidth={3} /></button>
      </div>
      {card.toolAvailable && (
        <button
          onClick={() => onResolve("tool")}
          style={{
            marginTop: 14, background: T.primary, color: T.primaryDeep, border: "none", borderRadius: 999,
            padding: "12px 18px", fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            maxWidth: 320, width: "88%",
          }}
        >
          Use Playbook
        </button>
      )}
      <div style={{ color: "rgba(255,255,255,0.65)", fontFamily: FONT_BODY, fontSize: 12.5, marginTop: 14, textAlign: "center" }}>
        Swipe, or tap {"\u2715"} / {"\u2713"}
      </div>
    </div>
  );
}

function circleBtnStyle(bg) {
  return {
    width: 58, height: 58, borderRadius: 999, background: bg, border: "none",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    boxShadow: `0 10px 20px -8px ${bg}99`,
  };
}

const overlayWrapStyle = {
  position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,46,93,0.92), rgba(5,20,38,0.96))",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "24px 16px", zIndex: 40, overflowY: "auto",
};

/* ---------------------------------------------------------------------------
   RESEARCH — guided, gates Playbook / Lesson completion
--------------------------------------------------------------------------- */

function ResearchOverlay({ lessonKey, onComplete, onSkip }) {
  const meta = getLessonMeta(lessonKey);
  const [step, setStep] = useState(0);
  const totalSteps = meta.research.points.length + 1;
  const isTipStep = step === meta.research.points.length;
  const Icon = meta.icon;
  const accent = kindAccent(meta.kind);

  return (
    <div style={{ ...overlayWrapStyle, zIndex: 55 }}>
      <div style={{ width: "88%", maxWidth: 320, background: T.cream, borderRadius: 26, padding: "24px 22px", position: "relative", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.55)" }}>
        <button onClick={onSkip} style={{ position: "absolute", top: 14, right: 14, background: T.cream2, border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={15} color={T.ink} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, paddingRight: 30 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={20} color={T.black} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.inkSoft, letterSpacing: 1 }}>
              {kindEyebrowResearch(meta.kind)}
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15.5, color: T.ink, lineHeight: 1.25 }}>{meta.research.headline}</div>
          </div>
        </div>

        <div style={{ margin: "18px 0 14px" }}><ProgressDots total={totalSteps} current={step} /></div>

        <div style={{ minHeight: 110, display: "flex", alignItems: "center" }}>
          {!isTipStep ? (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Lightbulb size={20} color={T.teal} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.ink, lineHeight: 1.55, fontWeight: 600 }}>
                {meta.research.points[step]}
              </div>
            </div>
          ) : (
            <div style={{ background: accent, borderRadius: 14, padding: "16px 14px", width: "100%" }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.black, letterSpacing: 1, marginBottom: 6, opacity: 0.65 }}>WHY IT MATTERS</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 14.5, color: T.black, lineHeight: 1.55, fontWeight: 600 }}>{meta.research.tip}</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {step > 0 && <GhostButton onClick={() => setStep(step - 1)} icon={ArrowLeft} style={{ flex: 1 }}>Back</GhostButton>}
          {!isTipStep ? (
            <PrimaryButton onClick={() => setStep(step + 1)} icon={ArrowRight} style={{ flex: 1 }}>Next</PrimaryButton>
          ) : (
            <PrimaryButton onClick={onComplete} icon={Check} style={{ flex: 1 }}>Got It</PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   RECEIPT — signature consequence reveal + learning status
--------------------------------------------------------------------------- */

function LearningStatus({ card, chosenSide, ledger, unlockedName, onResearchNow }) {
  if (!card) return null;
  const meta = getLessonMeta(card.lessonKey);
  const isSmart = chosenSide === card.smartSide || chosenSide === "tool";
  const bucketKey = meta.kind === "lesson" ? "lessons" : "playbooks";
  const completedBefore = ledger[bucketKey][card.lessonKey] && !unlockedName;
  const researched = !!ledger.researchedLessons[card.lessonKey];
  const Icon = meta.icon;
  const accent = kindAccent(meta.kind);

  if (unlockedName) {
    return (
      <div style={{ marginTop: 14, borderRadius: 12, background: accent, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, animation: "badgePop .5s ease .3s both" }}>
        <Award size={22} color={T.black} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.black, letterSpacing: 0.5, opacity: 0.65 }}>
            {kindEyebrowUnlock(meta.kind)}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: T.black }}>{unlockedName}</div>
          {meta.kind === "playbook" && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: T.black, opacity: 0.7, marginTop: 2 }}>Now a tool on later cards.</div>
          )}
        </div>
      </div>
    );
  }

  if (completedBefore) {
    return (
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, fontWeight: 700 }}>
        <Check size={14} color={T.green} /> Already mastered: {meta.name}
      </div>
    );
  }

  if (isSmart) {
    return (
      <div style={{ marginTop: 14, borderRadius: 12, background: T.cream2, border: `1.5px dashed ${accent}`, padding: "12px 14px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Icon size={16} color={T.teal} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.ink, lineHeight: 1.4 }}>
            Smart move. Research <b>{meta.name}</b> to lock in the {meta.kind === "lesson" ? "Lesson" : "Playbook"}.
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <GhostButton icon={BookOpen} onClick={() => onResearchNow(card.lessonKey)} style={{ padding: "10px 14px", fontSize: 13 }}>Research Now</GhostButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, borderRadius: 12, background: T.cream2, padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Icon size={16} color={T.inkSoft} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.4 }}>
          {researched
            ? <>Didn't line up with <b>{meta.name}</b> this time — you've got the research banked for next time.</>
            : <>This one didn't quite match <b>{meta.name}</b>.</>}
        </div>
      </div>
      {!researched && (
        <div style={{ marginTop: 10 }}>
          <GhostButton icon={BookOpen} onClick={() => onResearchNow(card.lessonKey)} style={{ padding: "10px 14px", fontSize: 13 }}>Research It</GhostButton>
        </div>
      )}
    </div>
  );
}

function Receipt({ items, total, bagDelta, onContinue, isLifeEnd, card, chosenSide, ledger, unlockedName, onResearchNow }) {
  return (
    <div style={overlayWrapStyle}>
      <div style={{
        width: "88%", maxWidth: 320, background: T.white, borderRadius: 4, padding: "26px 22px",
        boxShadow: "0 30px 70px -20px rgba(0,0,0,0.6)", fontFamily: "'Space Grotesk', monospace",
        animation: "printIn .4s cubic-bezier(.2,.8,.2,1)", position: "relative",
      }}>
        <div style={{ textAlign: "center", borderBottom: `2px dashed ${T.line}`, paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: T.inkSoft, fontWeight: 700 }}>THE BAG</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginTop: 4 }}>
            {isLifeEnd ? "LIFE SUMMARY" : "RECEIPT"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", fontSize: 14, color: T.ink,
              animation: `lineIn .3s ease ${0.1 + i * 0.12}s both`,
            }}>
              <span style={{ fontFamily: FONT_BODY, fontWeight: 600, paddingRight: 10 }}>{it.label}</span>
              <span style={{ fontWeight: 700, color: it.amount > 0 ? T.green : it.amount < 0 ? T.redOrange : T.inkSoft, whiteSpace: "nowrap" }}>
                {it.amount === 0 ? "\u2014" : money(it.amount)}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `2px dashed ${T.line}`, marginTop: 16, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13, color: T.inkSoft, letterSpacing: 0.5 }}>NET</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: total >= 0 ? T.green : T.redOrange }}>{money(total)}</span>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
          <Pill icon={bagDelta >= 0 ? TrendingUp : TrendingDown} tone={bagDelta >= 0 ? "green" : "red"}>
            Bag Score {bagDelta >= 0 ? "+" : ""}{bagDelta}
          </Pill>
        </div>

        <LearningStatus card={card} chosenSide={chosenSide} ledger={ledger} unlockedName={unlockedName} onResearchNow={onResearchNow} />

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, letterSpacing: 2, color: "#6E8598", fontWeight: 700 }}>
          {"\u2726 \u2726 \u2726 \u2726 \u2726 \u2726 \u2726 \u2726 \u2726 \u2726"}
        </div>
      </div>

      <div style={{ width: "88%", maxWidth: 320, marginTop: 18 }}>
        <PrimaryButton onClick={onContinue} icon={ArrowRight}>{isLifeEnd ? "Start a New Life" : "Continue"}</PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   TOAST
--------------------------------------------------------------------------- */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 60,
      background: T.black, color: T.white, padding: "10px 16px", borderRadius: 999,
      display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13,
      boxShadow: "0 10px 24px -8px rgba(0,0,0,0.4)", animation: "toastIn .3s ease",
      whiteSpace: "nowrap", maxWidth: "88%", textAlign: "center",
    }}>
      <Sparkles size={15} color={T.primarySoft} /> {toast}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   SCREENS
--------------------------------------------------------------------------- */

function TopBar({ title, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "18px 20px 6px", gap: 10 }}>
      {onBack && (
        <button onClick={onBack} style={{ background: T.cream2, border: "none", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronLeft size={18} color={T.ink} />
        </button>
      )}
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: T.ink, flex: 1 }}>{title}</div>
      {right}
    </div>
  );
}

function QuizScreen({ step, setStep, onFinish }) {
  const [tally, setTally] = useState({ saver: 0, splurger: 0, freezer: 0, chaser: 0 });
  const total = QUIZ.length;

  const choose = (type) => {
    const next = { ...tally, [type]: tally[type] + 1 };
    setTally(next);
    if (step + 1 >= total) {
      const winner = Object.entries(next).sort((a, b) => b[1] - a[1])[0][0];
      onFinish(winner);
    } else {
      setStep(step + 1);
    }
  };

  const q = QUIZ[step];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 22px", background: T.cream }}>
      <div style={{ paddingTop: 26, paddingBottom: 18 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: 1.5, textAlign: "center" }}>
          FIND YOUR MONEY TYPE
        </div>
        <div style={{ marginTop: 14 }}><ProgressDots total={total} current={step} /></div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 23, color: T.ink, lineHeight: 1.3, marginBottom: 22 }}>
          {q.q}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map((o, i) => (
            <button key={i} onClick={() => choose(o.type)} style={{
              textAlign: "left", background: T.white, border: `1.5px solid ${T.line}`, borderRadius: 999,
              padding: "16px 18px", fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 600, color: T.ink,
              cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            }}>
              {o.t} <ChevronRight size={16} color={T.inkSoft} />
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

function MoneyTypeReveal({ type, onNext }) {
  const mt = MONEY_TYPES[type];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 22px", alignItems: "center", justifyContent: "center", textAlign: "center", background: T.cream }}>
      <div style={{
        width: 84, height: 84, borderRadius: 999, background: T.primary,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
        boxShadow: "0 16px 32px -12px rgba(52,154,255,0.45)",
      }}>
        <Sparkles size={34} color={T.primaryDeep} />
      </div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: 1.5 }}>YOUR MONEY TYPE IS</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 32, color: T.ink, marginTop: 10 }}>
        <Highlight bg={T.primary} color={T.primaryDeep}>{mt.label}</Highlight>
      </div>
      <div style={{ marginTop: 12 }}><Pill tone="green" icon={Check}>{mt.trait}</Pill></div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.inkSoft, lineHeight: 1.6, marginTop: 18, maxWidth: 280 }}>
        {mt.blurb}
      </div>
      <div style={{ width: "100%", marginTop: 34 }}>
        <PrimaryButton onClick={onNext} icon={ArrowRight}>Next: My Money Goal</PrimaryButton>
      </div>
    </div>
  );
}

function GoalScreen({ goal, setGoal, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.cream }}>
      <div style={{ padding: "26px 22px 10px" }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: 1.5, textAlign: "center" }}>ONE LAST THING</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 23, color: T.ink, marginTop: 10, textAlign: "center", lineHeight: 1.3 }}>
          What's your money goal <Highlight bg={T.primary} color={T.primaryDeep}>right now?</Highlight>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.inkSoft, marginTop: 10, textAlign: "center" }}>
          We'll build you a personal Playbook around it.
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GOAL_OPTIONS.map((g) => {
            const Icon = g.icon;
            const selected = goal === g.id;
            return (
              <button key={g.id} onClick={() => setGoal(g.id)} style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                background: selected ? T.black : T.white, border: `1.5px solid ${selected ? T.black : T.line}`,
                borderRadius: 999, padding: "10px 14px", cursor: "pointer",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 999, background: selected ? T.primarySoft : T.cream2,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon size={18} color={selected ? T.black : T.inkSoft} />
                </div>
                <span style={{ flex: 1, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 14.5, color: selected ? T.white : T.ink }}>{g.label}</span>
                {selected && <Check size={18} color={T.primarySoft} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "12px 22px 22px" }}>
        <PrimaryButton onClick={onNext} icon={ArrowRight} disabled={!goal}>Build My Playbook</PrimaryButton>
      </div>
    </div>
  );
}

function CharacterScreen({ av, setAv, onFinish }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar title="Build Your Character" />
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 22px 22px" }}>
        <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 20px" }}>
          <div style={{ background: T.cream2, borderRadius: 999, padding: 8, boxShadow: "inset 0 0 0 1px " + T.line }}>
            <Avatar av={av} size={128} />
          </div>
        </div>

        <label style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: 1 }}>YOUR NAME</label>
        <input
          value={av.name}
          onChange={(e) => setAv({ ...av, name: e.target.value })}
          placeholder="Type your name"
          maxLength={16}
          style={{
            width: "100%", marginTop: 8, marginBottom: 20, padding: "13px 14px", borderRadius: 14,
            border: `1.5px solid ${T.line}`, fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: T.ink,
            background: T.white, outline: "none", boxSizing: "border-box",
          }}
        />

        <SwatchRow label="SKIN TONE" values={SKIN_TONES} active={av.skin} onPick={(v) => setAv({ ...av, skin: v })} />
        <SwatchRow label="HAIR COLOR" values={HAIR_COLORS} active={av.hairColor} onPick={(v) => setAv({ ...av, hairColor: v })} />

        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: 1, marginBottom: 8 }}>HAIR STYLE</div>
          <div style={{ display: "flex", gap: 8 }}>
            {HAIR_STYLES.map((h) => (
              <button key={h} onClick={() => setAv({ ...av, hairStyle: h })} style={{
                flex: 1, padding: "10px 0", borderRadius: 999, textTransform: "capitalize",
                border: `2px solid ${av.hairStyle === h ? T.primary : T.line}`,
                background: av.hairStyle === h ? T.primarySoft : T.white, color: T.ink,
                fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>{h}</button>
            ))}
          </div>
        </div>

        <SwatchRow label="OUTFIT COLOR" values={OUTFIT_COLORS} active={av.outfit} onPick={(v) => setAv({ ...av, outfit: v })} />
      </div>
      <div style={{ padding: "12px 22px 22px" }}>
        <PrimaryButton onClick={onFinish} icon={ArrowRight} disabled={!av.name.trim()}>Enter The Bag</PrimaryButton>
      </div>
    </div>
  );
}

function SwatchRow({ label, values, active, onPick }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 10 }}>
        {values.map((v) => (
          <button key={v} onClick={() => onPick(v)} style={{
            width: 32, height: 32, borderRadius: 999, background: v, cursor: "pointer",
            border: active === v ? `3px solid ${T.ink}` : `3px solid transparent`,
            boxShadow: "0 0 0 1px " + T.line,
          }} />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: T.ink }}>{title}</div>
      {right && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, fontWeight: 700 }}>{right}</div>}
    </div>
  );
}

function learningState(ledger, key, bucket) {
  if (ledger[bucket][key]) return "completed";
  if (ledger.researchedLessons[key]) return "researching";
  return "locked";
}

function GoalPlaybookCard({ goal, ledger }) {
  if (!goal) return null;
  const meta = getLessonMeta(goal);
  const state = learningState(ledger, goal, "playbooks");
  const Icon = meta.icon;
  return (
    <div style={{
      borderRadius: 20, background: T.black, padding: "16px 16px", display: "flex", alignItems: "center", gap: 14,
      marginBottom: 10, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: 999, background: "rgba(39,198,217,0.14)" }} />
      <div style={{ width: 50, height: 50, borderRadius: 15, background: T.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
        <Icon size={22} color={T.black} />
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 700, color: T.teal, letterSpacing: 1 }}>YOUR GOAL PLAYBOOK</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, color: T.white, marginTop: 2 }}>{meta.name}</div>
      </div>
      <div style={{ position: "relative", flexShrink: 0 }}>
        {state === "completed" && <Check size={20} color={T.teal} strokeWidth={3} />}
        {state === "researching" && <BookOpen size={18} color={T.teal} />}
        {state === "locked" && <Lock size={16} color="rgba(255,255,255,0.5)" />}
      </div>
    </div>
  );
}

function PlaybookBadge({ meta, state }) {
  const Icon = meta.icon;
  const styles = {
    completed: { bg: T.primaryDeep, border: T.primaryDeep, iconColor: T.white, textColor: T.white },
    researching: { bg: T.primarySoft, border: T.primarySoft, iconColor: T.primaryDeep, textColor: T.ink },
    locked: { bg: T.cream2, border: T.line, iconColor: "#6E8598", textColor: "#527085" },
  }[state];
  return (
    <div style={{ borderRadius: 16, padding: "16px 12px", background: styles.bg, border: `1.5px solid ${styles.border}`, textAlign: "center", position: "relative" }}>
      {state === "locked" && <Lock size={13} color={T.inkSoft} style={{ position: "absolute", top: 10, right: 10 }} />}
      {state === "researching" && <BookOpen size={13} color={T.primaryDeep} style={{ position: "absolute", top: 10, right: 10 }} />}
      {state === "completed" && <Check size={13} color={T.white} style={{ position: "absolute", top: 10, right: 10 }} />}
      <Icon size={24} color={styles.iconColor} />
      <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, color: styles.textColor, marginTop: 8, lineHeight: 1.3 }}>{meta.name}</div>
    </div>
  );
}

function LessonRow({ meta, state }) {
  const Icon = meta.icon;
  const tone = state === "locked" ? "neutral" : "primary";
  const label = state === "completed" ? "Mastered" : state === "researching" ? "In progress" : "Locked";
  const chipBg = state === "completed" ? T.primaryDeep : state === "researching" ? T.primarySoft : T.cream2;
  const chipIconColor = state === "completed" ? T.white : state === "researching" ? T.primaryDeep : "#6E8598";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 2px", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: chipBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={chipIconColor} />
      </div>
      <div style={{ flex: 1, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13, color: state === "locked" ? "#527085" : T.ink }}>{meta.name}</div>
      <Pill tone={tone}>{label}</Pill>
    </div>
  );
}

function LifeScreen({ av, life, ledger, onAgeUp, goal }) {
  const stage = LIFE_STAGE(life.age);
  const playbookEntries = Object.entries(PLAYBOOKS);
  const lessonEntries = Object.entries(LESSONS);
  const playbooksDone = playbookEntries.filter(([k]) => ledger.playbooks[k]).length;
  const lessonsDone = lessonEntries.filter(([k]) => ledger.lessons[k]).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, fontWeight: 700 }}>Hey, {av.name || "there"}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 21, color: T.ink }}>Age {life.age} · {stage}</div>
            </div>
            <div style={{ background: T.cream2, borderRadius: 999, padding: 6 }}><Avatar av={av} size={44} /></div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Pill tone={life.cash >= 0 ? "green" : "red"}>{money(life.cash)}</Pill>
            <Pill icon={Trophy} tone="primary">Bag Score {Math.round(ledger.bagScore)}</Pill>
            {life.job && <Pill icon={Wallet}>{life.job}</Pill>}
          </div>
        </div>

        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ background: T.primarySoft, borderRadius: 22, padding: "22px 20px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ background: T.white, borderRadius: 999, padding: 6, boxShadow: "0 6px 16px -6px rgba(10,46,93,0.25)" }}>
              <Avatar av={av} size={84} />
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16.5, color: T.ink, marginTop: 12 }}>{stage}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(10,46,93,0.65)", marginTop: 4, lineHeight: 1.5 }}>
              {life.cardsThisLife} decision{life.cardsThisLife === 1 ? "" : "s"} made this life
            </div>
          </div>
        </div>

        <div style={{ padding: "22px 20px 0" }}>
          <SectionHeader title="Bag Score" />
          <div style={{ background: T.black, borderRadius: 22, padding: "22px 16px", marginTop: 10 }}>
            <BagScoreRing score={ledger.bagScore} />
            <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: "rgba(255,255,255,0.72)", textAlign: "center", marginTop: 14, lineHeight: 1.45, fontWeight: 600 }}>
              Smart choices add points; avoidant or impulse choices subtract. 300–850, like a credit score.
            </div>
          </div>
        </div>

        <div style={{ padding: "22px 20px 0" }}>
          <SectionHeader title="Playbooks" right={`${playbooksDone}/${playbookEntries.length}`} />
          <div style={{ marginTop: 10 }}>
            <GoalPlaybookCard goal={goal} ledger={ledger} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {playbookEntries.map(([key, meta]) => (
                <PlaybookBadge key={key} meta={{ ...meta, kind: "playbook" }} state={learningState(ledger, key, "playbooks")} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "22px 20px 0" }}>
          <SectionHeader title="Lessons" right={`${lessonsDone}/${lessonEntries.length}`} />
          <div style={{ marginTop: 6 }}>
            {lessonEntries.map(([key, meta], i) => (
              <LessonRow key={key} meta={{ ...meta, kind: "lesson" }} state={learningState(ledger, key, "lessons")} />
            ))}
          </div>
        </div>

        <div style={{ padding: "22px 20px 18px" }}>
          <SectionHeader title="Life History" />
          <div style={{ marginTop: 10 }}>
            {ledger.history.length === 0 ? (
              <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.inkSoft, background: T.cream2, borderRadius: 14, padding: 16 }}>
                No completed lives yet — this fills in as a passport of stamps once you finish your first one.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ledger.history.slice().reverse().map((h, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12, background: T.white, border: `1.5px solid ${T.line}`,
                    borderRadius: 14, padding: "12px 14px",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 999, background: T.primarySoft, display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0,
                    }}>
                      <Star size={16} color={T.primaryDeep} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13.5, color: T.ink }}>Life to age {h.finalAge}</div>
                      <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft }}>Ended with {money(h.finalCash)} · Bag Score {Math.round(h.finalScore)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 20px", borderTop: `1.5px solid ${T.line}`, background: T.cream }}>
        <PrimaryButton onClick={onAgeUp} icon={ArrowRight}>Live Through Age {life.age + 1}</PrimaryButton>
      </div>
    </div>
  );
}

function ArchiveOverlay({ history, onClose }) {
  const entries = history.slice().reverse();
  return (
    <div style={{ ...overlayWrapStyle, background: "rgba(10,46,93,0.75)" }}>
      <div style={{
        width: "88%", maxWidth: 330, maxHeight: "78%", background: T.cream, borderRadius: 26, padding: "22px 20px",
        position: "relative", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: T.cream2, border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={15} color={T.ink} />
        </button>
        <div style={{ textAlign: "center", marginBottom: 16, paddingRight: 26 }}>
          <Archive size={24} color={T.primaryDeep} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: T.ink, marginTop: 8 }}>Bag Check Archive</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>Your past questions & answers</div>
        </div>
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.length === 0 ? (
            <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: T.inkSoft, textAlign: "center", padding: "18px 10px", background: T.cream2, borderRadius: 14 }}>
              No past answers yet — complete today's Bag Check to start your archive.
            </div>
          ) : (
            entries.map((h, i) => (
              <div key={i} style={{ background: T.cream2, borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13, color: T.ink }}>{h.title}</div>
                  <Pill tone={h.bagDelta >= 0 ? "green" : "red"}>{h.bagDelta >= 0 ? "+" : ""}{h.bagDelta}</Pill>
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginTop: 4, lineHeight: 1.4 }}>{h.prompt}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: T.ink, marginTop: 8 }}>You chose: <b>{h.chosenLabel}</b></div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LeaderRow({ p }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12,
      background: p.isYou ? T.primarySoft : "rgba(255,255,255,0.07)",
    }}>
      <div style={{ width: 20, textAlign: "center", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13, color: p.isYou ? T.black : "rgba(255,255,255,0.75)" }}>{p.rank}</div>
      <div style={{
        width: 26, height: 26, borderRadius: 999, background: p.isYou ? T.black : "rgba(255,255,255,0.14)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 11, color: p.isYou ? T.primarySoft : T.white }}>
          {(p.name || "?").charAt(0).toUpperCase()}
        </span>
      </div>
      <div style={{ flex: 1, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13, color: p.isYou ? T.black : T.white }}>{p.isYou ? "You" : p.name}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13, color: p.isYou ? T.black : "rgba(255,255,255,0.9)" }}>{Math.round(p.score)}</div>
    </div>
  );
}

function Leaderboard({ name, score }) {
  const combined = [...MOCK_LEADERBOARD, { name: name || "You", score, isYou: true }]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  const you = combined.find((p) => p.isYou);
  const top5 = combined.slice(0, 5);
  const youInTop5 = you.rank <= 5;

  return (
    <div style={{ background: T.black, borderRadius: 20, padding: "16px 16px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Trophy size={16} color={T.primarySoft} />
        <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: T.primarySoft, letterSpacing: 1 }}>BAG SCORE LEADERBOARD</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {top5.map((p) => <LeaderRow key={p.rank} p={p} />)}
        {!youInTop5 && (
          <>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12, padding: "1px 0" }}>···</div>
            <LeaderRow p={you} />
          </>
        )}
      </div>
    </div>
  );
}

function BagCheckScreen({ bagCheck, onAnswer, onSimNextDay, av, ledger }) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const s = bagCheck.scenario;

  const archiveButton = (
    <button onClick={() => setArchiveOpen(true)} style={{ background: T.cream2, border: "none", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <Archive size={16} color={T.ink} />
    </button>
  );

  // Returning to the tab after already answering today — no results shown,
  // just the reminder. Past answers live behind the archive button instead.
  if (bagCheck.answeredToday && !bagCheck.justAnswered) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="The Bag Check" right={archiveButton} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px 40px", textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 999, background: T.cream2, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Check size={24} color="#0A6B44" />
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.ink, lineHeight: 1.6, fontWeight: 600 }}>
            Come back tomorrow for a new one — the whole player base gets the same scenario. Make sure to complete the Bag Check to compete.
          </div>
          <button onClick={onSimNextDay} style={{ marginTop: 18, background: "none", border: "none", color: T.inkSoft, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
            Simulate next day (demo)
          </button>
        </div>
        {archiveOpen && <ArchiveOverlay history={bagCheck.history} onClose={() => setArchiveOpen(false)} />}
      </div>
    );
  }

  // Just answered, still on this tab — full result + leaderboard.
  if (bagCheck.answeredToday && bagCheck.justAnswered) {
    const chosen = bagCheck.chosenSide === "left" ? s.left : s.right;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="The Bag Check" right={archiveButton} />
        <div style={{ flex: 1, padding: "6px 20px 24px", overflowY: "auto" }}>
          <div style={{
            marginTop: 8, background: T.white, border: `1.5px solid ${T.line}`, borderRadius: 4, padding: "22px 20px",
            fontFamily: "'Space Grotesk', monospace",
          }}>
            <div style={{ textAlign: "center", borderBottom: `2px dashed ${T.line}`, paddingBottom: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: T.inkSoft, fontWeight: 700 }}>THE BAG CHECK</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginTop: 4 }}>{s.title}</div>
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: T.ink, marginBottom: 16 }}>You chose: <b>{chosen.label}</b></div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ComparisonBar label={s.left.label} pct={s.left.pct} highlight={bagCheck.chosenSide === "left"} />
              <ComparisonBar label={s.right.label} pct={s.right.pct} highlight={bagCheck.chosenSide === "right"} />
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
              <Pill icon={chosen.bagDelta >= 0 ? TrendingUp : TrendingDown} tone={chosen.bagDelta >= 0 ? "green" : "red"}>
                Bag Score {chosen.bagDelta >= 0 ? "+" : ""}{chosen.bagDelta}
              </Pill>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <GhostButton icon={Share2} onClick={onAnswer.share}>Share Result</GhostButton>
          </div>

          <Leaderboard name={av?.name} score={ledger?.bagScore ?? 620} />
        </div>
        {archiveOpen && <ArchiveOverlay history={bagCheck.history} onClose={() => setArchiveOpen(false)} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar title="The Bag Check" right={archiveButton} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px 22px" }}>
        <Pill icon={Zap} tone="primary" style={{ alignSelf: "center" }}>Free, 30 seconds, everyone gets this one</Pill>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22, color: T.ink, marginTop: 16, textAlign: "center" }}>{s.title}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: T.inkSoft, marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>{s.prompt}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <button onClick={() => onAnswer.choose("left")} style={choiceBtnStyle}>{s.left.label}</button>
          <button onClick={() => onAnswer.choose("right")} style={choiceBtnStyle}>{s.right.label}</button>
        </div>
      </div>
      {archiveOpen && <ArchiveOverlay history={bagCheck.history} onClose={() => setArchiveOpen(false)} />}
    </div>
  );
}

const choiceBtnStyle = {
  textAlign: "left", background: T.white, border: `1.5px solid ${T.line}`, borderRadius: 999,
  padding: "16px 18px", fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 700, color: T.ink, cursor: "pointer",
};

function ComparisonBar({ label, pct, highlight }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontFamily: FONT_BODY, fontWeight: 700, color: highlight ? T.primaryDeep : T.inkSoft, marginBottom: 4 }}>
        <span>{label}{highlight && "  \u2190 you"}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: T.cream2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: highlight ? T.primary : "#CBD9E3", transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

function SettingsScreen({ av, moneyType, onOpenPaywall, onResetAll }) {
  const mt = MONEY_TYPES[moneyType];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar title="Settings" />
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, background: T.cream2, borderRadius: 18, padding: 16 }}>
          <Avatar av={av} size={56} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, color: T.ink }}>{av.name || "Player"}</div>
            <Pill tone="primary">{mt?.label || "Money Type"}</Pill>
          </div>
        </div>

        <button onClick={onOpenPaywall} style={{
          marginTop: 18, width: "100%", textAlign: "left", background: T.primaryDeep,
          border: "none", borderRadius: 18, padding: "16px 18px", cursor: "pointer", color: T.white,
        }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15.5 }}>Upgrade to Family Plan</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, marginTop: 4, color: "rgba(255,255,255,0.9)" }}>The Bag Check stays free either way — this unlocks extra Decision Decks & customization.</div>
        </button>

        <div style={{ marginTop: 22, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: 1 }}>ACCOUNT</div>
        <SettingsRow icon={Bell} label="Notifications" value="Daily Bag Check reminder" />
        <SettingsRow icon={CreditCard} label="Subscription" value="Free plan" />
        <SettingsRow icon={HelpCircle} label="Help & feedback" value="" />

        <div style={{ marginTop: 22, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: 1 }}>DEMO CONTROLS</div>
        <button onClick={onResetAll} style={{
          marginTop: 10, width: "100%", textAlign: "left", background: T.white, border: `1.5px solid ${T.line}`,
          borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        }}>
          <RotateCcw size={16} color={T.redOrange} />
          <span style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 13.5, color: T.redOrange }}>Reset all progress</span>
        </button>
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 2px", borderBottom: `1px solid ${T.line}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: T.cream2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={T.ink} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 14, color: T.ink }}>{label}</div>
        {value && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft }}>{value}</div>}
      </div>
      <ChevronRight size={16} color={T.inkSoft} />
    </div>
  );
}

function PaywallOverlay({ onClose }) {
  const [annual, setAnnual] = useState(true);
  const [msg, setMsg] = useState("");
  return (
    <div style={{ ...overlayWrapStyle, background: "rgba(10,46,93,0.75)" }}>
      <div style={{ width: "88%", maxWidth: 330, background: T.cream, borderRadius: 26, padding: "22px 20px 20px", position: "relative", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: T.cream2, border: "none", borderRadius: 999, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={15} color={T.ink} />
        </button>
        <div style={{ textAlign: "center" }}>
          <Trophy size={30} color={T.teal} />
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, color: T.ink, marginTop: 8 }}>Family Plan</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft, marginTop: 4 }}>One parent subscription, one teen player.</div>
        </div>

        <div style={{ display: "flex", background: T.cream2, borderRadius: 12, padding: 4, marginTop: 18 }}>
          <button onClick={() => setAnnual(false)} style={togBtnStyle(!annual)}>Monthly</button>
          <button onClick={() => setAnnual(true)} style={togBtnStyle(annual)}>Annual <span style={{ color: "#0A6B44" }}>· save 34%</span></button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 34, color: T.ink }}>{annual ? "$79" : "$9.99"}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.inkSoft }}>/{annual ? "year" : "month"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
          {["Full Decision Deck library, all Money Types", "Extra avatar customization", "Parent dashboard & spending insight reports", "The Bag Check is always free \u2014 upgrade or not"].map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Check size={15} color={T.green} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: T.ink, lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <PrimaryButton onClick={() => setMsg("This is a UI demo \u2014 checkout wires up to RevenueCat next.")}>Start Free Trial</PrimaryButton>
        </div>
        {msg && <div style={{ textAlign: "center", fontFamily: FONT_BODY, fontSize: 12, color: T.inkSoft, marginTop: 10 }}>{msg}</div>}
      </div>
    </div>
  );
}

function togBtnStyle(active) {
  return {
    flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
    background: active ? T.white : "transparent", color: active ? T.ink : T.inkSoft,
    fontFamily: FONT_BODY, fontWeight: 700, fontSize: 12.5,
    boxShadow: active ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
  };
}

/* ---------------------------------------------------------------------------
   BOTTOM NAV — floating pill, icon-only
--------------------------------------------------------------------------- */
function BottomNav({ tab, setTab }) {
  const items = [
    { key: "home", icon: Home },
    { key: "bagcheck", icon: Zap },
    { key: "settings", icon: SettingsIcon },
  ];
  return (
    <div style={{ padding: "10px 16px 16px", background: T.cream, display: "flex", justifyContent: "center" }}>
      <div style={{
        display: "flex", gap: 6, background: T.black, borderRadius: 999, padding: 6,
        boxShadow: "0 14px 28px -14px rgba(0,0,0,0.5)",
      }}>
        {items.map((it) => {
          const active = tab === it.key;
          const Icon = it.icon;
          return (
            <button key={it.key} onClick={() => setTab(it.key)} style={{
              width: 46, height: 46, borderRadius: 999, border: "none", cursor: "pointer",
              background: active ? T.primarySoft : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={20} color={active ? T.black : "rgba(255,255,255,0.65)"} strokeWidth={active ? 2.6 : 2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   APP ROOT
--------------------------------------------------------------------------- */

const LIFE_END_AGE = 26;

function makeInitialLedger() {
  return {
    bagScore: 620,
    playbooks: Object.fromEntries(Object.keys(PLAYBOOKS).map((k) => [k, false])),
    lessons: Object.fromEntries(Object.keys(LESSONS).map((k) => [k, false])),
    researchedLessons: {},
    history: [],
  };
}

const defaultAvatar = () => ({
  name: "", skin: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairStyle: "long", outfit: OUTFIT_COLORS[0],
});
const initialLife = () => ({ age: 15, cash: 180, job: null, usedCardIds: [], cardsThisLife: 0 });

export default function App() {
  const [saved] = useState(() => loadState());
  const [phase, setPhase] = useState(saved?.phase ?? "quiz"); // quiz -> reveal -> goal -> character -> main
  const [quizStep, setQuizStep] = useState(saved?.quizStep ?? 0);
  const [moneyType, setMoneyType] = useState(saved?.moneyType ?? null);
  const [goal, setGoalState] = useState(saved?.goal ?? null);

  const [av, setAv] = useState(saved?.av ?? defaultAvatar());

  const [life, setLife] = useState(saved?.life ?? initialLife());
  const [ledger, setLedger] = useState(saved?.ledger ?? makeInitialLedger());

  const [tab, setTab] = useState("home");
  const [overlay, setOverlay] = useState(null); // {type:'decision'|'receipt'|'lifeEnd', ...}
  const [research, setResearch] = useState(null); // {lessonKey, onComplete}
  const [toast, setToast] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const [bagCheck, setBagCheck] = useState(() => makeBagCheckState(saved?.bagCheck));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    // Ledger persist: Player snapshot (phase, Money Type, life, ledger, Bag Check) is write-through to localStorage.
    saveState({
      phase, quizStep, moneyType, goal, av, life, ledger,
      bagCheck: {
        demoOffset: bagCheck.demoOffset,
        answeredDate: bagCheck.answeredDate,
        chosenSide: bagCheck.chosenSide,
        history: bagCheck.history,
      },
    });
  }, [phase, quizStep, moneyType, goal, av, life, ledger, bagCheck]);

  // Once the player leaves the Bag Check tab, the "just answered" results +
  // leaderboard view should not come back on its own — only the reminder
  // screen should, until a new scenario is answered (or simulated).
  useEffect(() => {
    if (tab !== "bagcheck") {
      setBagCheck((prev) => (prev.justAnswered ? { ...prev, justAnswered: false } : prev));
    }
  }, [tab]);

  const pickNextCard = useCallback((nextAge) => {
    // Money Type → deck: milestones always fire. Saver (the filmed path) draws
    // type cards in authored order so the demo never shuffles. Other types stay random.
    let card = null;
    if (MILESTONES[nextAge]) card = MILESTONES[nextAge];
    else if (nextAge === GOAL_CARD_AGE && goal && GOAL_CARDS[goal]) card = GOAL_CARDS[goal];
    else {
      const typeDeck = TYPE_CARDS[moneyType] || [];
      const unusedType = typeDeck.filter((c) => !life.usedCardIds.includes(c.id));
      const unusedWild = WILDCARDS.filter((c) => !life.usedCardIds.includes(c.id));
      if (moneyType === "saver") {
        card = unusedType[0] || unusedWild[0] || typeDeck[0] || WILDCARDS[0];
      } else {
        const pool = [...unusedType, ...unusedWild];
        const source = pool.length ? pool : [...typeDeck, ...WILDCARDS];
        card = source[Math.floor(Math.random() * source.length)];
      }
    }
    return withPlaybookTool(card, ledger);
  }, [moneyType, life.usedCardIds, goal, ledger]);

  const onAgeUp = () => {
    const nextAge = life.age + 1;
    const card = pickNextCard(nextAge);
    setOverlay({ type: "decision", card, nextAge });
  };

  const onResolveDecision = (dir) => {
    const { card, nextAge } = overlay;
    const result = tryCompleteLearning(ledger, card, dir);
    let unlockedName = null;
    if (result.unlockedName) {
      setLedger(result.ledger);
      unlockedName = result.unlockedName;
      setToast(`${kindWord(result.meta.kind)}: ${unlockedName}`);
    }
    setOverlay({ type: "receipt", card, chosenSide: dir, nextAge, unlockedName });
  };

  const onContinueReceipt = () => {
    const { card, chosenSide, nextAge } = overlay;
    const choice = sideChoice(card, chosenSide);
    const newBagScore = clamp(ledger.bagScore + choice.bagDelta, 300, 850);

    if (nextAge >= LIFE_END_AGE) {
      const finalCash = life.cash + choice.cashDelta;
      setLedger((prev) => ({
        ...prev, bagScore: newBagScore,
        history: [...prev.history, { finalAge: nextAge, finalCash, finalScore: newBagScore }],
      }));
      setOverlay({
        type: "lifeEnd",
        items: [
          { label: "Final cash on hand", amount: finalCash },
        ],
        total: finalCash, bagDelta: choice.bagDelta, card, chosenSide,
        unlockedName: overlay.unlockedName,
      });
      return;
    }

    setLife((prev) => ({
      age: nextAge,
      cash: prev.cash + choice.cashDelta,
      job: choice.job || prev.job,
      usedCardIds: [...prev.usedCardIds, card.id],
      cardsThisLife: prev.cardsThisLife + 1,
    }));
    setLedger((prev) => ({ ...prev, bagScore: newBagScore }));
    setOverlay(null);
  };

  const onStartNewLife = () => {
    setLife(initialLife());
    setOverlay(null);
    setTab("home");
  };

  const openResearch = (lessonKey) => {
    setResearch({ lessonKey, onComplete: () => handleResearchComplete(lessonKey) });
  };

  const handleResearchComplete = (lessonKey) => {
    let next = { ...ledger, researchedLessons: { ...ledger.researchedLessons, [lessonKey]: true } };
    let unlockedName = null, kind = null;
    if (overlay && overlay.card && overlay.card.lessonKey === lessonKey) {
      const result = tryCompleteLearning(next, overlay.card, overlay.chosenSide);
      next = result.ledger;
      if (result.unlockedName) { unlockedName = result.unlockedName; kind = result.meta.kind; }
    }
    setLedger(next);
    if (unlockedName) {
      setToast(`${kindWord(kind)}: ${unlockedName}`);
      setOverlay((prev) => (prev && prev.card && prev.card.lessonKey === lessonKey ? { ...prev, unlockedName } : prev));
    }
    setResearch(null);
  };

  const onBagCheckChoose = (side) => {
    const choice = side === "left" ? bagCheck.scenario.left : bagCheck.scenario.right;
    setLedger((prev) => ({ ...prev, bagScore: clamp(prev.bagScore + choice.bagDelta, 300, 850) }));
    setBagCheck((prev) => ({
      ...prev,
      answeredDate: prev.dateKey,
      answeredToday: true,
      chosenSide: side,
      justAnswered: true,
      history: [...prev.history, { title: prev.scenario.title, prompt: prev.scenario.prompt, chosenLabel: choice.label, bagDelta: choice.bagDelta }],
    }));
  };
  const onBagCheckShare = async () => {
    const s = bagCheck.scenario;
    const chosen = bagCheck.chosenSide === "left" ? s.left : s.right;
    try {
      const result = await shareBagCheckCard({
        title: s.title,
        prompt: s.prompt,
        chosenLabel: chosen.label,
        left: s.left,
        right: s.right,
        chosenSide: bagCheck.chosenSide,
        bagDelta: chosen.bagDelta,
        name: av?.name,
        bagScore: ledger?.bagScore,
      });
      if (result === "downloaded") setToast("Saved bag-check.png");
    } catch {
      setToast("Could not share that card");
    }
  };
  const onSimNextDay = () => {
    setBagCheck((prev) => {
      const demoOffset = (prev.demoOffset || 0) + 1;
      const { dateKey, scenario } = getTodayBagCheck(demoOffset);
      return {
        ...prev,
        demoOffset,
        dateKey,
        scenario,
        answeredToday: false,
        chosenSide: null,
        justAnswered: false,
      };
    });
  };

  const onResetAll = () => {
    clearState();
    setPhase("quiz"); setQuizStep(0); setMoneyType(null); setGoalState(null);
    setAv(defaultAvatar());
    setLife(initialLife());
    setLedger(makeInitialLedger());
    setBagCheck(makeBagCheckState());
    setTab("home"); setOverlay(null); setResearch(null); setPaywallOpen(false);
  };

  let mainScreen = null;
  if (tab === "home") mainScreen = <LifeScreen av={av} life={life} ledger={ledger} onAgeUp={onAgeUp} goal={goal} />;
  if (tab === "bagcheck") mainScreen = (
    <BagCheckScreen bagCheck={bagCheck} onSimNextDay={onSimNextDay} av={av} ledger={ledger}
      onAnswer={{ choose: onBagCheckChoose, share: onBagCheckShare }} />
  );
  if (tab === "settings") mainScreen = <SettingsScreen av={av} moneyType={moneyType} onOpenPaywall={() => setPaywallOpen(true)} onResetAll={onResetAll} />;

  const receiptChoice = overlay?.type === "receipt" ? sideChoice(overlay.card, overlay.chosenSide) : null;

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: "#DCE6EE", display: "flex", justifyContent: "center", fontFamily: FONT_BODY }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #527085; }
        input:focus { border-color: ${T.primary} !important; }
        button { font-family: inherit; }
        @keyframes printIn { from { opacity: 0; transform: translateY(-14px) scale(0.97);} to { opacity: 1; transform: translateY(0) scale(1);} }
        @keyframes lineIn { from { opacity: 0; transform: translateX(-6px);} to { opacity: 1; transform: translateX(0);} }
        @keyframes badgePop { 0% { opacity:0; transform: scale(0.85);} 70% { transform: scale(1.03);} 100% { opacity:1; transform: scale(1);} }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -8px);} to { opacity: 1; transform: translate(-50%, 0);} }
        .phone-shell::-webkit-scrollbar { width: 0px; }
        @media (min-width: 481px) {
          .phone-shell { width: 400px !important; height: 860px !important; border-radius: 44px !important;
            box-shadow: 0 40px 90px -30px rgba(10,46,93,0.55), 0 0 0 10px #0A2E5D !important;
            margin: 26px 0 !important; }
        }
      `}</style>

      <div className="phone-shell" style={{
        width: "100%", height: "100dvh", background: T.cream, position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
          {phase === "quiz" && (
            <QuizScreen step={quizStep} setStep={setQuizStep} onFinish={(type) => { setMoneyType(type); setPhase("reveal"); }} />
          )}
          {phase === "reveal" && <MoneyTypeReveal type={moneyType} onNext={() => setPhase("goal")} />}
          {phase === "goal" && (
            <GoalScreen
              goal={goal}
              setGoal={setGoalState}
              onNext={() => {
                setLedger((prev) => (prev.playbooks[goal] !== undefined ? prev : { ...prev, playbooks: { ...prev.playbooks, [goal]: false } }));
                setPhase("character");
              }}
            />
          )}
          {phase === "character" && (
            <CharacterScreen av={av} setAv={setAv} onFinish={() => setPhase("main")} />
          )}
          {phase === "main" && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, overflow: "hidden" }}>{mainScreen}</div>
            </div>
          )}

          {overlay?.type === "decision" && (
            <DecisionCardOverlay
              card={overlay.card}
              onResolve={onResolveDecision}
              researched={!!ledger.researchedLessons[overlay.card.lessonKey]}
              onResearch={() => openResearch(overlay.card.lessonKey)}
            />
          )}
          {overlay?.type === "receipt" && receiptChoice && (
            <Receipt
              items={receiptChoice.receipt} total={receiptChoice.cashDelta} bagDelta={receiptChoice.bagDelta}
              onContinue={onContinueReceipt} card={overlay.card} chosenSide={overlay.chosenSide} ledger={ledger}
              unlockedName={overlay.unlockedName} onResearchNow={openResearch}
            />
          )}
          {overlay?.type === "lifeEnd" && (
            <Receipt
              items={overlay.items} total={overlay.total} bagDelta={overlay.bagDelta} onContinue={onStartNewLife}
              isLifeEnd card={overlay.card} chosenSide={overlay.chosenSide} ledger={ledger}
              unlockedName={overlay.unlockedName} onResearchNow={openResearch}
            />
          )}
          {research && (
            <ResearchOverlay lessonKey={research.lessonKey} onComplete={research.onComplete} onSkip={() => setResearch(null)} />
          )}
          {paywallOpen && <PaywallOverlay onClose={() => setPaywallOpen(false)} />}

          <Toast toast={toast} />
        </div>

        {phase === "main" && <BottomNav tab={tab} setTab={setTab} />}
      </div>
    </div>
  );
}
