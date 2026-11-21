import React from 'react';
import { motion } from 'motion/react';

const EASE = [0.2, 0.7, 0.2, 1];

/**
 * Fades content up once when it scrolls into view.
 * Reduced-motion users get an opacity-only fade (via <MotionConfig reducedMotion="user">).
 */
export default function Reveal({ as = 'div', delay = 0, y = 16, children, ...rest }) {
  const Component = motion[as];
  return (
    <Component
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Component>
  );
}

/** Props for an on-mount entrance (used in heroes, above the fold). */
export function enterProps(delay = 0, y = 14) {
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE }
  };
}
