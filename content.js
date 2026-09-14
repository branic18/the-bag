import raw from "./content/game.json" with { type: "json" };
import {
  Wallet, CreditCard, FileText, TrendingUp, Award, ShieldCheck, Lightbulb,
  RotateCcw, Users, MessageCircle, Flame, Zap, Wrench, Calendar, Search,
  Rocket, LineChart, Activity, PiggyBank, BadgeCheck, Compass, BookOpen,
} from "lucide-react";

const ICONS = {
  Wallet, CreditCard, FileText, TrendingUp, Award, ShieldCheck, Lightbulb,
  RotateCcw, Users, MessageCircle, Flame, Zap, Wrench, Calendar, Search,
  Rocket, LineChart, Activity, PiggyBank, BadgeCheck, Compass, BookOpen,
};

function withIcon(entry) {
  return { ...entry, icon: ICONS[entry.icon] || BookOpen };
}

function mapKeyed(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, withIcon(v)]));
}

export const MONEY_TYPES = raw.moneyTypes;
export const QUIZ = raw.quiz;
export const PLAYBOOKS = mapKeyed(raw.playbooks);
export const LESSONS = mapKeyed(raw.lessons);
export const GOAL_OPTIONS = raw.goalOptions.map(withIcon);
export const GOAL_PLAYBOOKS = mapKeyed(raw.goalPlaybooks);
export const GOAL_CARD_AGE = raw.goalCardAge;
export const MILESTONES = Object.fromEntries(raw.milestones.map((m) => [m.age, m]));
export const TYPE_CARDS = raw.typeCards;
export const WILDCARDS = raw.wildcards;
export const GOAL_CARDS = raw.goalCards;
