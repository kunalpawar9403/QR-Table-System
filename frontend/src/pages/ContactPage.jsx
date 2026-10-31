import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle, 
  Clock,
  MapPin
} from 'lucide-react';
import { motion } from 'motion/react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleOpenMailClient = () => {
    const subject = encodeURIComponent(formData.subject || 'TableMint POS Enquiry');
    const body = encodeURIComponent(`Hello TableMint Team,\n\nName: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`);
    window.location.href = `mailto:support@tablemint.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="tm-contact-page">
      {/* Page Hero */}
      <PageHero
        badge="Contact Us Via Email"
        title="We are Here to Answer"
        titleAccent="Your Questions"
        description="Have questions regarding hardware compatibility, pricing plans, or custom restaurant floor setups? Email our team directly."
      />

      {/* Main Content */}
      <section style={{ padding: '70px 24px 90px', background: '#F4F7F6' }}>
        <PageContainer maxWidth="1040px">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 40,
            alignItems: 'start'
          }}>
            {/* Left Column: Direct Email Details */}
            <motion.div 
              initial={{ opacity: 0, x: -25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(11, 175, 122, 0.1)',
                  color: '#0BAF7A',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  marginBottom: 14
                }}>
                  <Mail size={14} />
                  <span>Email Only Support</span>
                </span>
                <h2 style={{ fontSize: '2rem', color: '#172033', fontWeight: 800, marginBottom: 12 }}>
                  Email Our Team
                </h2>
                <p style={{ color: '#5e6d82', lineHeight: 1.6, fontSize: '0.98rem' }}>
                  We keep our communication fast, documented, and organized through dedicated email support. Every enquiry is routed directly to a product specialist.
                </p>
              </div>

              {/* Primary Email Card */}
              <motion.div 
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className="tm-card" 
                style={{
                  background: '#FFFFFF',
                  border: '2px solid #0BAF7A',
                  boxShadow: '0 8px 30px rgba(11, 175, 122, 0.12)',
                  padding: '32px'
                }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '12px',
                  background: '#e8f9f3',
                  color: '#0BAF7A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <Mail size={26} />
                </div>

                <h3 style={{ fontSize: '1.25rem', color: '#172033', marginBottom: 6 }}>
                  Direct Support & Sales
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 16 }}>
                  Click below to open your default email app or write to us directly:
                </p>

                <div style={{
                  background: '#F8FAFC',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginBottom: 20
                }}>
                  <a
                    href="mailto:support@tablemint.com"
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#0BAF7A',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    support@tablemint.com
                  </a>
                </div>

                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href="mailto:support@tablemint.com?subject=TableMint%20POS%20Enquiry"
                  className="tm-btn tm-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Mail size={16} />
                  <span>Send Us an Email</span>
                </motion.a>
              </motion.div>

              {/* Response Time & Security */}
              <div className="tm-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <Clock size={20} style={{ color: '#0BAF7A' }} />
                  <strong style={{ color: '#172033', fontSize: '0.95rem' }}>Response Time Guarantee</strong>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Our hospitality support team actively monitors our inbox. You will receive a personalized response within <strong>2 to 4 business hours</strong>.
                </p>
              </div>

              {/* Corporate Office Info */}
              <div className="tm-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <MapPin size={20} style={{ color: '#0BAF7A' }} />
                  <strong style={{ color: '#172033', fontSize: '0.95rem' }}>TableMint Headquarters</strong>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  TableMint Technologies Pvt. Ltd.<br />
                  100 Feet Road, HAL 2nd Stage, Indiranagar,<br />
                  Bangalore, Karnataka 560038, India
                </p>
              </div>
            </motion.div>

            {/* Right Column: Email Form */}
            <motion.div 
              initial={{ opacity: 0, x: 25 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              className="tm-card" 
              style={{ padding: 'clamp(28px, 4vw, 44px)', borderRadius: '24px' }}
            >
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '1.5rem', color: '#172033', fontWeight: 800, marginBottom: 8 }}>
                  Send an Email Message
                </h3>
                <p style={{ color: '#5e6d82', fontSize: '0.92rem' }}>
                  Fill out the form below to email us your enquiry or question.
                </p>
              </div>

              {submitted ? (
                <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#e8f9f3',
                    color: '#0BAF7A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <CheckCircle size={32} />
                  </div>
                  <h4 style={{ fontSize: '1.4rem', color: '#172033', marginBottom: 10 }}>
                    Message Ready!
                  </h4>
                  <p style={{ color: '#5e6d82', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 24px', fontSize: '0.94rem' }}>
                    Thank you, <strong>{formData.name}</strong>. We received your note. Click the button below to also launch your email client directly if needed:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleOpenMailClient}
                      className="tm-btn tm-btn-primary"
                      style={{ width: '100%' }}
                    >
                      <Mail size={16} />
                      <span>Open in Mail App</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSubmitted(false)}
                      className="tm-btn tm-btn-secondary"
                      style={{ width: '100%' }}
                    >
                      Write Another Note
                    </motion.button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                      Your Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rahul@bistro.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Question about thermal printers & GST billing"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: '#172033', marginBottom: 6 }}>
                      Your Message *
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Write your questions or setup details here..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <motion.button 
                    type="submit" 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="tm-btn tm-btn-primary tm-btn-lg" 
                    style={{ width: '100%', marginTop: 6 }}
                  >
                    <Send size={18} />
                    <span>Send Email Enquiry</span>
                  </motion.button>
                </form>
              )}
            </motion.div>
          </div>
        </PageContainer>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Ready to Elevate Your Dining Room?"
        subtitle="Sign up in 60 seconds with no credit card required. Experience TableMint's high-speed cloud POS right away."
      />
    </div>
  );
}
