import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Upload,
  LayoutDashboard,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  Smartphone,
  ArrowRight,
  Mail,
  FileVideo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';
import Reveal from '../components/marketing/Reveal';
import SectionHeader from '../components/marketing/SectionHeader';
import CheckList from '../components/marketing/CheckList';
import MediaFrame from '../components/marketing/MediaFrame';

const MODULES = [
  {
    id: 'dashboard',
    label: 'Live Dashboard',
    icon: LayoutDashboard,
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
    icon: UtensilsCrossed,
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
    icon: Receipt,
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
    icon: ChefHat,
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
    icon: Smartphone,
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

export default function DemoPage() {
  const [activeTourTab, setActiveTourTab] = useState('dashboard');
  const [videoSrc, setVideoSrc] = useState('/videos/demo.mp4');
  const [uploadedVideoName, setUploadedVideoName] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const currentMod = MODULES.find((m) => m.id === activeTourTab) || MODULES[0];

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
      <PageHero
        badge="Video Walkthrough & Live Tour"
        title="Watch TableMint POS in"
        titleAccent="Real-Life Action"
        description="Watch our video demo and explore actual application screenshots of the live system. See how orders flow smoothly from table to kitchen to final GST settlement."
        actions={
          <>
            <button type="button" onClick={scrollToVideo} className="tm-btn tm-btn-primary tm-btn-lg">
              <Play size={16} />
              <span>Watch Demo Video</span>
            </button>
            <Link to="/register" className="tm-btn tm-btn-secondary tm-btn-lg">
              <span>Start 14-Day Free Trial</span>
              <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      {/* ================= VIDEO ================= */}
      <section id="demo-video-section" className="tm-band-dark tm-scroll-target">
        <PageContainer maxWidth="1100px">
          <Reveal className="tm-video-head">
            <span className="tm-eyebrow is-on-dark">TableMint Product Video</span>
            <h2 className="tm-section-title">Full System Walkthrough Video</h2>
            <p className="tm-section-subtitle">
              Watch how our staff-friendly POS, live table grid, contactless QR ordering, and paperless kitchen screens work in harmony.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="tm-video-frame">
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster="/images/landing/hero_pos_mockup.jpg"
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support HTML5 video. Please try updating your browser.
            </video>
          </Reveal>

          <div className="tm-video-tools">
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              onChange={handleVideoUpload}
              hidden
            />
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="tm-btn tm-btn-outline-white tm-btn-sm"
            >
              <Upload size={15} />
              <span>Upload / Change Video</span>
            </button>

            {uploadedVideoName && (
              <span className="tm-file-chip">
                <FileVideo size={14} />
                <span>Loaded: {uploadedVideoName}</span>
              </span>
            )}
          </div>

          <p className="tm-video-tip">
            Tip: You can upload your own custom video recording using the "Upload / Change Video" button, or place it at <code>frontend/public/videos/demo.mp4</code>.
          </p>
        </PageContainer>
      </section>

      {/* ================= MODULE TOUR ================= */}
      <section className="tm-section">
        <PageContainer>
          <SectionHeader
            eyebrow="Real System Screenshots"
            title="Tour the Live TableMint Modules"
            subtitle="Inspect actual screenshots from each module of our cloud restaurant operating system."
          />

          <div className="tm-tabs" role="tablist" aria-label="TableMint modules">
            {MODULES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tm-tab-${id}`}
                aria-selected={activeTourTab === id}
                aria-controls="tm-tour-panel"
                className={`tm-tab ${activeTourTab === id ? 'is-active' : ''}`}
                onClick={() => setActiveTourTab(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTourTab}
              id="tm-tour-panel"
              role="tabpanel"
              aria-labelledby={`tm-tab-${activeTourTab}`}
              className="tm-tour-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <MediaFrame src={currentMod.image} alt={currentMod.title} tag="Live System Screen" loading="eager" />

              <div>
                <span className="tm-eyebrow">Module Tour: {currentMod.label}</span>
                <h3 className="tm-module-title">{currentMod.title}</h3>
                <p className="tm-module-headline">{currentMod.tagline}</p>
                <CheckList items={currentMod.points} />
                <div className="tm-actions is-inline">
                  <Link to="/register" className="tm-btn tm-btn-primary">
                    <span>Start 14-Day Free Trial</span>
                    <ArrowRight size={15} />
                  </Link>
                  <Link to="/contact" className="tm-btn tm-btn-secondary">
                    <Mail size={15} />
                    <span>Email Us With Questions</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </PageContainer>
      </section>

      <CTASection
        title="Ready to Test Drive TableMint Yourself?"
        subtitle="Create your restaurant workspace in 60 seconds with no credit card required and experience the platform right now."
      />
    </div>
  );
}
