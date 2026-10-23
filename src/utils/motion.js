// Seconds for Motion/GSAP; matching CSS tokens live in index.css.
export const motionTiming = { quick: 0.14, standard: 0.24, slow: 0.4 }
export const motionEase = { enter: [0.2, 0, 0, 1], exit: [0.4, 0, 1, 1] }

export function dialogMotion(reducedMotion) {
  return {
    initial: { opacity: 0, y: reducedMotion ? 0 : 12, scale: reducedMotion ? 1 : 0.985 },
    animate: {
      opacity: 1, y: 0, scale: 1,
      transition: { duration: reducedMotion ? 0.1 : motionTiming.standard, ease: motionEase.enter },
    },
    exit: {
      opacity: 0, y: reducedMotion ? 0 : 6, scale: reducedMotion ? 1 : 0.995,
      transition: { duration: reducedMotion ? 0.08 : motionTiming.quick, ease: motionEase.exit },
    },
  }
}
