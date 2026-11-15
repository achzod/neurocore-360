/**
 * FormCheck : petites briques d'animation partagées par la page de vente.
 * Tout passe par framer-motion (déjà dans le projet) et respecte prefers-reduced-motion.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

export const ACCENT = "#FCDD00";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Apparition douce au défilement (une seule fois). */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Compteur qui monte jusqu'à la valeur quand il entre à l'écran. */
export function CountUp({
  to,
  duration = 1.6,
  decimals = 0,
  className,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const value = useMotionValue(reduce ? to : 0);
  const text = useTransform(value, (v) => v.toFixed(decimals).replace(".", ","));

  useEffect(() => {
    if (!inView || reduce) {
      if (reduce) value.set(to);
      return;
    }
    const controls = animate(value, to, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, reduce, to, duration, value]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}
