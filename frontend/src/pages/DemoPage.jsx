import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Upload, 
  Video, 
  LayoutDashboard, 
  UtensilsCrossed, 
  Receipt, 
  ChefHat, 
  Smartphone, 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Mail,
  FileVideo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';

export default function DemoPage() {
  const [activeTourTab, setActiveTourTab] = useState('dashboard');
  const [videoSrc, setVideoSrc] = useState('/videos/demo.mp4');
  const [uploadedVideoName, setUploadedVideoName] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const modules = [
    {
      id: 'dashboard',
      label: 'Live Dashboard',
      icon: <LayoutDashboard size={18} />,
      title: 'Real-Time Floor & Revenue Command Center',
      tagline: 'Always know what is happening across your tables and cash desk.',
      image: '/images/landing/screen_dashboard.jpg',
      points: [
        'Live table occupancy counter with Vacant, Seated, and Dining counts',
        'Gross sales & net revenue pace tracked by the minute',
        'Recent orders log with table numbers and token status',
        'Direct quick actions to punch bills, reserve tables, or view KDS'
      ]
    },
    {
      id: 'tables',
      label: 'Table Floor Map',
      icon: <UtensilsCrossed size={18} />,
      title: 'Interactive Visual Table Grid',
      tagline: 'Eliminate floor confusion and seat diners faster.',
      image: '/images/landing/screen_tables.jpg',
      points: [
        'Color-coded table indicators: Green (Available), Red (Occupied), Amber (Billed)',
        'Click any table to open current running order or generate tax invoice',
        'Add, edit, or reorganize tables with custom capacity limits',
        'QR stand download and print directly for each table'
      ]
    },
    {
      id: 'billing',
      label: 'Express POS Billing',
      icon: <Receipt size={18} />,
      title: 'Lightning-Fast Thermal Invoicing & Split Pay',
      tagline: 'From order punch to settled payment in 3 seconds.',
      image: '/images/landing/screen_pos_billing.jpg',
      points: [
        'Fast-search item catalog with vegetarian/non-veg tags',
        'Automated CGST/SGST tax computation with restaurant GSTIN',
        'Dynamic UPI QR code on bill for instant customer scanning',
        'Split bill evenly among guests or by custom dishes'
      ]
    },
    {
      id: 'kds',
      label: 'Kitchen KDS',
      icon: <ChefHat size={18} />,
      title: 'Paperless Kitchen Order Routing',
      tagline: 'Chefs prepare orders with zero lost tickets and precise timers.',
      image: '/images/landing/hero_pos_mockup.jpg',
      points: [
        'Live tickets appear automatically with audio chime alert',
        'Elapsed cooking timers show if orders exceed target prep time',
        'Check off cooked items individually as they finish on the stove',
        'One-click mark order ready to notify waitstaff immediately'
      ]
    },
    {
      id: 'devices',
      label: 'Multi-Device Sync',
      icon: <Smartphone size={18} />,
      title: 'Zero Hardware Lock-In',
      tagline: 'Runs on iPads, Android tablets, laptops, and thermal printers.',
      image: '/images/landing/devices_showcase.jpg',
      points: [
        'Captains take orders on iPad Mini or budget Android tablets',
        'Cashier operates Windows touchscreen or desktop PC',
        'Chefs view high-contrast KDS on wall-mounted display',
        'Owners check live restaurant sales from their mobile phones'
      ]
    }
  ];

  const currentMod = modules.find((m) => m.id === activeTourTab) || modules[0];

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setUploadedVideoName(file.name);
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const scrollToVideo = () => {
    const el = document.getElementById('demo-video-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="tm-demo-page">
      {/* Page Hero */}
      <PageHero
        badge="Video Walkthrough & Live Tour"
        title="Watch TableMint POS in"
        titleAccent="Real-Life Action"
        description="Watch our video demo and explore actual application screenshots of the live system. See how orders flow smoothly from table to kitchen to final GST settlement."
        actions={
          <>
            <button
              type="button"
              onClick={scrollToVideo}
              className="tm-btn tm-btn-primary tm-btn-lg"
            >
              <Play size={18} />
              <span>Watch Demo Video</span>
            </button>
            <Link to="/register" className="tm-btn tm-btn-outline-white tm-btn-lg">
              <span>Start 14-Day Free Trial</span>
              <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      {/* =========================================================
          VIDEO SHOWCASE & UPLOAD SECTION
          ========================================================= */}
      <section 
        id="demo-video-section"
        style={{
          padding: '80px 24px 70px',
          background: 'linear-gradient(180deg, #062D22 0%, #08382b 60%, #F4F7F6 100%)',
          color: '#FFFFFF'
        }}
      >
        <PageContainer maxWidth="1100px">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(22, 201, 149, 0.15)',
              border: '1px solid rgba(22, 201, 149, 0.35)',
              color: '#16C995',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 14
            }}>
              <Video size={14} />
              <span>TableMint Product Video</span>
            </span>

            <h2 style={{
              fontSize: 'clamp(1.9rem, 3.5vw, 2.7rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              marginBottom: 12
            }}>
              Full System Walkthrough Video
            </h2>

            <p style={{
              fontSize: '1.05rem',
              color: '#cbd5e1',
              maxWidth: '650px',
              margin: '0 auto 24px',
              lineHeight: 1.6
            }}>
              Watch how our staff-friendly POS, live table grid, contactless QR ordering, and paperless kitchen screens work in harmony.
            </p>

            {/* Video Upload Control Action */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                onChange={handleVideoUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="tm-btn"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  color: '#FFFFFF',
                  padding: '9px 18px',
                  fontSize: '0.88rem'
                }}
              >
                <Upload size={16} />
                <span>Upload / Change Video</span>
              </button>

              {uploadedVideoName && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#16C995',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: 'rgba(22, 201, 149, 0.15)',
                  padding: '6px 12px',
                  borderRadius: '6px'
                }}>
                  <FileVideo size={15} />
                  <span>Loaded: {uploadedVideoName}</span>
                </span>
              )}
            </div>
          </div>

          {/* Video Player Frame */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              background: '#041711',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '2px solid rgba(22, 201, 149, 0.35)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 35px rgba(11, 175, 122, 0.25)',
              position: 'relative'
            }}
          >
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster="/images/landing/hero_pos_mockup.jpg"
              style={{
                width: '100%',
                maxHeight: '620px',
                display: 'block',
                background: '#041711'
              }}
            >
              <source src={videoSrc} type="video/mp4" />
              <source src="/gemini_generated_video_3e7c2cd2.mp4" type="video/mp4" />
              Your browser does not support HTML5 video. Please try updating your browser.
            </video>
          </motion.div>

          <div style={{
            textAlign: 'center',
            marginTop: 18,
            fontSize: '0.84rem',
            color: '#8a9ba8'
          }}>
            Tip: You can upload your own custom video recording using the "Upload / Change Video" button, or place it at <code>frontend/public/videos/demo.mp4</code>.
          </div>
        </PageContainer>
      </section>

      {/* =========================================================
          MODULE SCREENSHOT TOUR
          ========================================================= */}
      <section style={{ padding: '80px 24px 90px', background: '#F4F7F6' }}>
        <PageContainer>
          <div className="tm-section-header">
            <span className="tm-section-badge">
              <Sparkles size={14} />
              <span>Real System Screenshots</span>
            </span>
            <h2 className="tm-section-title">
              Tour the Live TableMint Modules
            </h2>
            <p className="tm-section-subtitle">
              Inspect actual screenshots from each module of our cloud restaurant operating system.
            </p>
          </div>

          {/* Module Tab Selector */}
          <div className="tm-demo-tabs-bar" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 44
          }}>
            {modules.map((m) => (
              <motion.button
                key={m.id}
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveTourTab(m.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '11px 22px',
                  borderRadius: '9999px',
                  border: 'none',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTourTab === m.id ? '#062D22' : '#FFFFFF',
                  color: activeTourTab === m.id ? '#16C995' : '#5e6d82',
                  boxShadow: activeTourTab === m.id ? '0 4px 15px rgba(6, 45, 34, 0.2)' : '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                {m.icon}
                <span>{m.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Module Showcase Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTourTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 40px rgba(6, 45, 34, 0.08)',
                padding: 'clamp(24px, 4vw, 48px)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 48,
                alignItems: 'center'
              }}
            >
              {/* Screenshot */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.1)',
                  background: '#041711',
                  position: 'relative'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  background: 'rgba(6, 45, 34, 0.9)',
                  color: '#16C995',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(22, 201, 149, 0.3)',
                  zIndex: 2
                }}>
                  Live System Screen
                </span>
                <img 
                  src={currentMod.image} 
                  alt={currentMod.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    maxHeight: '440px',
                    objectFit: 'cover'
                  }}
                />
              </motion.div>

              {/* Content & Details */}
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(11, 175, 122, 0.1)',
                  color: '#0BAF7A',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  marginBottom: 14
                }}>
                  <span>Module Tour: {currentMod.label}</span>
                </div>

                <h3 style={{
                  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                  fontWeight: 800,
                  color: '#172033',
                  lineHeight: 1.25,
                  marginBottom: 10
                }}>
                  {currentMod.title}
                </h3>

                <p style={{
                  fontSize: '1.05rem',
                  color: '#062D22',
                  fontWeight: 600,
                  marginBottom: 20
                }}>
                  {currentMod.tagline}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
                  {currentMod.points.map((pt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.94rem', color: '#172033' }}>
                      <CheckCircle size={17} style={{ color: '#0BAF7A', flexShrink: 0, marginTop: 2 }} />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <Link to="/register" className="tm-btn tm-btn-primary">
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link to="/contact" className="tm-btn tm-btn-secondary">
                    <Mail size={16} />
                    <span>Email Us With Questions</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </PageContainer>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Ready to Test Drive TableMint Yourself?"
        subtitle="Create your restaurant workspace in 60 seconds with no credit card required and experience the platform right now."
      />
    </div>
  );
}
