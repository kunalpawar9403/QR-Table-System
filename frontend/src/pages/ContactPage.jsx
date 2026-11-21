import React, { useState } from 'react';
import { Mail, Send, CheckCircle, Clock, MapPin } from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';
import Reveal from '../components/marketing/Reveal';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

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
      <PageHero
        badge="Contact Us Via Email"
        title="We are Here to Answer"
        titleAccent="Your Questions"
        description="Have questions regarding hardware compatibility, pricing plans, or custom restaurant floor setups? Email our team directly."
      />

      <section className="tm-section">
        <PageContainer maxWidth="1120px">
          <div className="tm-contact-grid">
            {/* Direct contact details */}
            <Reveal>
              <span className="tm-eyebrow">Email Only Support</span>
              <h2 className="tm-section-title">Email Our Team</h2>
              <p className="tm-section-subtitle">
                We keep our communication fast, documented, and organized through dedicated email support. Every enquiry is routed directly to a product specialist.
              </p>

              <ul className="tm-contact-list">
                <li className="tm-contact-item">
                  <span className="tm-contact-icon"><Mail size={18} /></span>
                  <div>
                    <h3 className="tm-contact-item-title">Direct Support & Sales</h3>
                    <a href="mailto:support@tablemint.com" className="tm-contact-email">
                      support@tablemint.com
                    </a>
                  </div>
                </li>
                <li className="tm-contact-item">
                  <span className="tm-contact-icon"><Clock size={18} /></span>
                  <div>
                    <h3 className="tm-contact-item-title">Response Time Guarantee</h3>
                    <p>
                      Our hospitality support team actively monitors our inbox. You will receive a personalized response within <strong>2 to 4 business hours</strong>.
                    </p>
                  </div>
                </li>
                <li className="tm-contact-item">
                  <span className="tm-contact-icon"><MapPin size={18} /></span>
                  <div>
                    <h3 className="tm-contact-item-title">TableMint Headquarters</h3>
                    <p>
                      TableMint Technologies Pvt. Ltd.<br />
                      100 Feet Road, HAL 2nd Stage, Indiranagar,<br />
                      Bangalore, Karnataka 560038, India
                    </p>
                  </div>
                </li>
              </ul>

              <a
                href="mailto:support@tablemint.com?subject=TableMint%20POS%20Enquiry"
                className="tm-btn tm-btn-secondary"
              >
                <Mail size={16} />
                <span>Send Us an Email</span>
              </a>
            </Reveal>

            {/* Email form */}
            <Reveal delay={0.08} className="tm-form-card">
              {submitted ? (
                <div className="tm-form-success" role="status">
                  <div className="tm-form-success-icon">
                    <CheckCircle size={28} />
                  </div>
                  <h3 className="tm-form-title">Message Ready!</h3>
                  <p>
                    Thank you, <strong>{formData.name}</strong>. We received your note. Click the button below to also launch your email client directly if needed:
                  </p>
                  <div className="tm-actions">
                    <button type="button" onClick={handleOpenMailClient} className="tm-btn tm-btn-primary tm-btn-lg">
                      <Mail size={16} />
                      <span>Open in Mail App</span>
                    </button>
                    <button type="button" onClick={() => setSubmitted(false)} className="tm-btn tm-btn-secondary tm-btn-lg">
                      Write Another Note
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="tm-form-head">
                    <h3 className="tm-form-title">Send an Email Message</h3>
                    <p>Fill out the form below to email us your enquiry or question.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="tm-form">
                    <div className="tm-form-row">
                      <div>
                        <label htmlFor="contact-name" className="tm-label">Your Name *</label>
                        <input
                          id="contact-name"
                          type="text"
                          required
                          autoComplete="name"
                          placeholder="e.g. Rahul Sharma"
                          value={formData.name}
                          onChange={updateField('name')}
                          className="tm-input"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="tm-label">Your Email Address *</label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="rahul@bistro.com"
                          value={formData.email}
                          onChange={updateField('email')}
                          className="tm-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-subject" className="tm-label">Subject *</label>
                      <input
                        id="contact-subject"
                        type="text"
                        required
                        placeholder="e.g. Question about thermal printers & GST billing"
                        value={formData.subject}
                        onChange={updateField('subject')}
                        className="tm-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="tm-label">Your Message *</label>
                      <textarea
                        id="contact-message"
                        rows={5}
                        required
                        placeholder="Write your questions or setup details here..."
                        value={formData.message}
                        onChange={updateField('message')}
                        className="tm-input"
                      />
                    </div>

                    <button type="submit" className="tm-btn tm-btn-primary tm-btn-lg tm-btn-block">
                      <Send size={16} />
                      <span>Send Email Enquiry</span>
                    </button>
                  </form>
                </>
              )}
            </Reveal>
          </div>
        </PageContainer>
      </section>

      <CTASection
        title="Ready to Elevate Your Dining Room?"
        subtitle="Sign up in 60 seconds with no credit card required. Experience TableMint's high-speed cloud POS right away."
      />
    </div>
  );
}
