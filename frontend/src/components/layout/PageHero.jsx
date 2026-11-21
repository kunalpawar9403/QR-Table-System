import React from 'react';
import { motion } from 'motion/react';
import { enterProps } from '../marketing/Reveal';

export default function PageHero({
  badge,
  title,
  titleAccent,
  description,
  actions,
  children
}) {
  return (
    <section className="tm-page-hero">
      <div className="tm-page-hero-inner">
        {badge && (
          <motion.span className="tm-eyebrow" {...enterProps(0)}>
            {badge}
          </motion.span>
        )}

        <motion.h1 className="tm-page-title" {...enterProps(0.06)}>
          {title}
          {titleAccent && <> <em>{titleAccent}</em></>}
        </motion.h1>

        {description && (
          <motion.p className="tm-page-hero-desc" {...enterProps(0.12)}>
            {description}
          </motion.p>
        )}

        {actions && (
          <motion.div className="tm-actions is-center tm-page-hero-actions" {...enterProps(0.18)}>
            {actions}
          </motion.div>
        )}

        {children && <motion.div {...enterProps(0.18)}>{children}</motion.div>}
      </div>
    </section>
  );
}
