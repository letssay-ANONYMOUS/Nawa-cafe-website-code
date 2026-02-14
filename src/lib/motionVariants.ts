import type { Variants } from "framer-motion";

/* ── Overlay ─────────────────────────────────────── */
export const overlayVariants: Variants = {
  visible: { opacity: 1, scale: 1 },
  exit: {
    opacity: 0,
    scale: 1.04,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const overlayLogoVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
};

/* ── Stagger container ───────────────────────────── */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

/* ── Fade-up child ───────────────────────────────── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Scale-fade child ────────────────────────────── */
export const scaleFade: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Card hover ──────────────────────────────────── */
export const cardHover = {
  rest: { y: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  hover: {
    y: -6,
    boxShadow: "0 16px 40px rgba(0,0,0,0.14)",
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

/* ── Button hover ────────────────────────────────── */
export const buttonHover = {
  whileHover: { scale: 1.05, transition: { duration: 0.18 } },
  whileTap: { scale: 0.97, transition: { duration: 0.1 } },
};

/* ── Progress bar ────────────────────────────────── */
export const progressVariants: Variants = {
  initial: { scaleX: 0 },
  animate: {
    scaleX: 1,
    transition: { duration: 1, ease: [0.22, 1, 0.36, 1] },
  },
};
