import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  TrendingUp
} from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';

export default function SolutionsPage() {
  const solutions = [
    {
      id: "restaurants",
      badge: "Fine Dining & Casual Restaurants",
      title: "Elevate Guest Dining & Course Pacing",
      subtitle: "Tailored for full-service dining, multi-course meals, and large family tables.",
      image: "/images/landing/type_restaurant.jpg",
      challenges: [
        "Captains running back and forth to punch orders at distant POS stations",
        "Guests waiting 10-15 minutes just to receive their bill during weekend peaks",
        "Complex group bill splitting causing cashier headaches"
      ],
      features: [
        {
          title: "Mobile Captain Tablets",
          desc: "Waitstaff take orders tableside on iPads or Android tablets; KOTs route to the kitchen instantly."
        },
        {
          title: "Intelligent Course Pacing",
          desc: "Fire appetizers, mains, and desserts with precision so food arrives hot and sequenced."
        },
        {
          title: "Split Bill in Seconds",
          desc: "Easily split checks evenly, by seat, or itemized with mixed payment methods."
        },
        {
          title: "Multi-Zone Seating Plans",
          desc: "Manage Main Hall, AC Private Dining, Outdoor Balcony, and Patio from one screen."
        }
      ],
      roi: "35% faster table turnover and 0 order punch errors."
    },
    {
      id: "cafes",
      badge: "Cafes & Quick Service (QSR)",
      title: "Lightning-Fast Counter Checkout & Combos",
      subtitle: "Built for speed, rapid breakfast rushes, and high-frequency transactions.",
      image: "/images/landing/type_cafe.jpg",
      challenges: [
        "Long customer queues during morning coffee and lunch rushes",
        "Complicated drink modifiers (dairy-free, sweetness, syrups) getting mixed up",
        "Manual counter invoicing slowing down cashier turnover"
      ],
      features: [
        {
          title: "3-Second Express Checkout",
          desc: "Touch screen shortcuts for top coffee drinks and pastries with instant UPI QR payment."
        },
        {
          title: "Rich Item Modifiers",
          desc: "Seamless selection of milk types, sweetness levels, size upgrades, and flavor shots."
        },
        {
          title: "Takeaway Token Queue",
          desc: "Automated customer order tokens with display screen callouts when drinks are ready."
        },
        {
          title: "Combo Deals & Bundles",
          desc: "Automatic combo price recalculations (e.g. Sandwich + Cappuccino savings)."
        }
      ],
      roi: "Double counter throughput during peak rush hours."
    },
    {
      id: "bars",
      badge: "Bars, Lounges & Breweries",
      title: "Keep Tabs Open & Drinks Flowing",
      subtitle: "Optimized for high-volume nightlife, loud environments, and fast drink reorders.",
      image: "/images/landing/type_bar.jpg",
      challenges: [
        "Unsettled or lost bar tabs when guests move around the venue",
        "Slow bartender order entry in dim lighting and loud music",
        "Happy hour pricing requiring manual discount entry"
      ],
      features: [
        {
          title: "Open Bar Tabs & Pre-Auth",
          desc: "Open customer tabs with a customer name or table number; add drinks effortlessly throughout the night."
        },
        {
          title: "Automated Happy Hours",
          desc: "Schedule time-based 1+1 offers and happy hour rates that turn on and off automatically."
        },
        {
          title: "Dedicated Bar KDS",
          desc: "Bartenders see craft cocktail orders on a water-resistant display separated from kitchen food."
        },
        {
          title: "Table QR Quick Re-Orders",
          desc: "Guests scan their table QR code to order another round of beers without waiting for the server."
        }
      ],
      roi: "22% increase in beverage sales through frictionless re-ordering."
    },
    {
      id: "cloud-kitchen",
      badge: "Cloud Kitchens & Ghost Kitchens",
      title: "Multi-Brand Kitchen Orchestration",
      subtitle: "Streamline high-volume delivery dispatch from a single central prep kitchen.",
      image: "/images/landing/type_cloud_kitchen.jpg",
      challenges: [
        "Managing multiple delivery brand menus without chaotic mixing",
        "Chefs confused between orders belonging to Brand A vs Brand B",
        "Missed delivery rider handoffs and packaging errors"
      ],
      features: [
        {
          title: "Unified Multi-Brand Screen",
          desc: "Manage Biryani, Pizza, and Dessert brands within a single centralized kitchen interface."
        },
        {
          title: "Synchronized KDS Timers",
          desc: "Coordinate preparation times across different cooking stations so all items finish together."
        },
        {
          title: "Order Dispatch Tokens",
          desc: "Print clear packaging labels with brand logos, customer addresses, and rider pickup tags."
        },
        {
          title: "Central Menu Control",
          desc: "Update prices and 86 sold-out ingredients across all virtual brands simultaneously."
        }
      ],
      roi: "Zero missing item claims and 15% reduction in kitchen prep times."
    }
  ];

  return (
    <div className="tm-solutions-page">
      {/* Page Hero */}
      <PageHero
        badge="Tailored Hospitality Solutions"
        title="Purpose-Built Software For"
        titleAccent="Your Service Model"
        description="Whether you run an upscale fine dining venue, an express cafe, an energetic craft brewery, or a multi-brand cloud kitchen, TableMint adapts perfectly to your service rhythm."
        actions={
          <Link to="/register" className="tm-btn tm-btn-primary tm-btn-lg">
            <span>Find the Right Plan for You</span>
            <ArrowRight size={18} />
          </Link>
        }
      />

      {/* Solutions Detail Sections */}
      <section style={{ padding: '80px 24px', background: '#F4F7F6' }}>
        <PageContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 90 }}>
            {solutions.map((sol, idx) => {
              const isEven = idx % 2 === 1;
              return (
                <div
                  key={sol.id}
                  id={sol.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 30px rgba(6, 45, 34, 0.05)',
                    padding: 'clamp(28px, 4vw, 48px)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 48,
                    alignItems: 'center'
                  }}
                >
                  {/* Content Column */}
                  <div style={{ order: isEven ? 2 : 1 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(11, 175, 122, 0.1)',
                      color: '#0BAF7A',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      marginBottom: 16
                    }}>
                      {sol.badge}
                    </span>

                    <h2 style={{
                      fontSize: 'clamp(1.7rem, 3vw, 2.3rem)',
                      fontWeight: 800,
                      color: '#172033',
                      lineHeight: 1.25,
                      marginBottom: 12
                    }}>
                      {sol.title}
                    </h2>

                    <p style={{
                      fontSize: '1rem',
                      color: '#5e6d82',
                      lineHeight: 1.6,
                      marginBottom: 24
                    }}>
                      {sol.subtitle}
                    </p>

                    {/* Features grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 16,
                      marginBottom: 24
                    }}>
                      {sol.features.map((f, fIdx) => (
                        <div key={fIdx} style={{
                          background: '#F8FAFC',
                          padding: '16px',
                          borderRadius: '12px',
                          border: '1px solid #edf2f7'
                        }}>
                          <h4 style={{ fontSize: '0.96rem', color: '#172033', marginBottom: 6, fontWeight: 700 }}>
                            {f.title}
                          </h4>
                          <p style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.5 }}>
                            {f.desc}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* ROI Highlight Pill */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#e8f9f3',
                      border: '1px solid #a7f3d0',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontSize: '0.88rem',
                      color: '#062D22',
                      fontWeight: 600,
                      marginBottom: 24
                    }}>
                      <TrendingUp size={18} style={{ color: '#0BAF7A', flexShrink: 0 }} />
                      <span><strong>Proven Impact:</strong> {sol.roi}</span>
                    </div>

                    <div>
                      <Link to="/register" className="tm-btn tm-btn-primary">
                        <span>Deploy for {sol.badge.split('&')[0]}</span>
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>

                  {/* Image Column */}
                  <div style={{
                    order: isEven ? 1 : 2,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.08)'
                  }}>
                    <img 
                      src={sol.image} 
                      alt={sol.title}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        maxHeight: '420px',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </PageContainer>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Tailored Software, Exceptional Dining"
        subtitle="Schedule a 1-on-1 walkthrough with a restaurant specialist to see how TableMint fits your exact venue layout."
      />
    </div>
  );
}
