import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import PageHero from '../components/layout/PageHero';
import PageContainer from '../components/layout/PageContainer';
import CTASection from '../components/layout/CTASection';
import Reveal from '../components/marketing/Reveal';
import MediaFrame from '../components/marketing/MediaFrame';

const SOLUTIONS = [
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
      { title: "Mobile Captain Tablets", desc: "Waitstaff take orders tableside on iPads or Android tablets; KOTs route to the kitchen instantly." },
      { title: "Intelligent Course Pacing", desc: "Fire appetizers, mains, and desserts with precision so food arrives hot and sequenced." },
      { title: "Split Bill in Seconds", desc: "Easily split checks evenly, by seat, or itemized with mixed payment methods." },
      { title: "Multi-Zone Seating Plans", desc: "Manage Main Hall, AC Private Dining, Outdoor Balcony, and Patio from one screen." }
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
      { title: "3-Second Express Checkout", desc: "Touch screen shortcuts for top coffee drinks and pastries with instant UPI QR payment." },
      { title: "Rich Item Modifiers", desc: "Seamless selection of milk types, sweetness levels, size upgrades, and flavor shots." },
      { title: "Takeaway Token Queue", desc: "Automated customer order tokens with display screen callouts when drinks are ready." },
      { title: "Combo Deals & Bundles", desc: "Automatic combo price recalculations (e.g. Sandwich + Cappuccino savings)." }
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
      { title: "Open Bar Tabs & Pre-Auth", desc: "Open customer tabs with a customer name or table number; add drinks effortlessly throughout the night." },
      { title: "Automated Happy Hours", desc: "Schedule time-based 1+1 offers and happy hour rates that turn on and off automatically." },
      { title: "Dedicated Bar KDS", desc: "Bartenders see craft cocktail orders on a water-resistant display separated from kitchen food." },
      { title: "Table QR Quick Re-Orders", desc: "Guests scan their table QR code to order another round of beers without waiting for the server." }
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
      { title: "Unified Multi-Brand Screen", desc: "Manage Biryani, Pizza, and Dessert brands within a single centralized kitchen interface." },
      { title: "Synchronized KDS Timers", desc: "Coordinate preparation times across different cooking stations so all items finish together." },
      { title: "Order Dispatch Tokens", desc: "Print clear packaging labels with brand logos, customer addresses, and rider pickup tags." },
      { title: "Central Menu Control", desc: "Update prices and 86 sold-out ingredients across all virtual brands simultaneously." }
    ],
    roi: "Zero missing item claims and 15% reduction in kitchen prep times."
  }
];

export default function SolutionsPage() {
  return (
    <div className="tm-solutions-page">
      <PageHero
        badge="Tailored Hospitality Solutions"
        title="Purpose-Built Software For"
        titleAccent="Your Service Model"
        description="Whether you run an upscale fine dining venue, an express cafe, an energetic craft brewery, or a multi-brand cloud kitchen, TableMint adapts perfectly to your service rhythm."
        actions={
          <Link to="/register" className="tm-btn tm-btn-primary tm-btn-lg">
            <span>Find the Right Plan for You</span>
            <ArrowRight size={17} />
          </Link>
        }
      />

      <PageContainer>
        <div className="tm-modules">
          {SOLUTIONS.map((sol, idx) => (
            <section
              key={sol.id}
              id={sol.id}
              className={`tm-module is-top ${idx % 2 === 1 ? 'is-reversed' : ''}`}
              aria-labelledby={`${sol.id}-title`}
            >
              <Reveal className="tm-module-copy">
                <span className="tm-eyebrow">{sol.badge}</span>
                <h2 id={`${sol.id}-title`} className="tm-module-title">{sol.title}</h2>
                <p className="tm-solution-sub">{sol.subtitle}</p>

                <h3 className="tm-subhead">Common challenges</h3>
                <ul className="tm-challenges">
                  {sol.challenges.map((c) => <li key={c}>{c}</li>)}
                </ul>

                <h3 className="tm-subhead">How TableMint helps</h3>
                <div className="tm-mini-grid">
                  {sol.features.map((f) => (
                    <div key={f.title}>
                      <h4 className="tm-mini-title">{f.title}</h4>
                      <p className="tm-mini-desc">{f.desc}</p>
                    </div>
                  ))}
                </div>

                <p className="tm-roi">
                  <TrendingUp size={18} />
                  <span><strong>Proven Impact:</strong> {sol.roi}</span>
                </p>

                <Link to="/register" className="tm-btn tm-btn-primary">
                  <span>Deploy for {sol.badge.split('&')[0].trim()}</span>
                  <ArrowRight size={15} />
                </Link>
              </Reveal>

              <Reveal delay={0.08} className="tm-module-media">
                <MediaFrame src={sol.image} alt={sol.title} />
              </Reveal>
            </section>
          ))}
        </div>
      </PageContainer>

      <CTASection
        title="Tailored Software, Exceptional Dining"
        subtitle="Schedule a 1-on-1 walkthrough with a restaurant specialist to see how TableMint fits your exact venue layout."
      />
    </div>
  );
}
