import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { TextEffect } from '../motion-primitives/text-effect';

export default function PageHero({
  badge,
  title,
  titleAccent,
  description,
  actions,
  children
}) {
  return (
    <div className="tm-page-hero-wrapper">
      <section className="tm-page-hero">
        <div className="tm-page-hero-inner">
          {badge && (
            <motion.div 
              className="tm-hero-badge"
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Sparkles size={14} />
              <span>{badge}</span>
            </motion.div>
          )}

          <h1 className="tm-page-hero-title" style={{ color: '#FFFFFF' }}>
            <span style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>
              <TextEffect per="word" preset="fade-in-blur" delay={0.1}>
                {title}
              </TextEffect>
            </span>{' '}
            {titleAccent && (
              <motion.span 
                initial={{ opacity: 0, filter: 'blur(8px)', y: 8 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ 
                  color: '#16C995', 
                  background: 'linear-gradient(135deg, #FFFFFF 30%, #16C995 100%)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block'
                }}
              >
                {titleAccent}
              </motion.span>
            )}
          </h1>

          {description && (
            <motion.p 
              className="tm-page-hero-desc"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              {description}
            </motion.p>
          )}

          {actions && (
            <motion.div 
              className="tm-page-hero-actions"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              {actions}
            </motion.div>
          )}

          {children}
        </div>
      </section>
    </div>
  );
}
