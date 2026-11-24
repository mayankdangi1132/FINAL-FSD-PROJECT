import { Link } from 'react-router-dom';
import { ChefHat, HeartHandshake, Leaf, Sprout } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { IMAGES } from '../data/constants.js';
import { Img, PageHeader } from '../components/ui.jsx';

const VALUES = [
  { icon: Sprout, title: 'Locally sourced', text: 'Vegetables from farms within 100 km, delivered fresh every morning.' },
  { icon: ChefHat, title: 'Cooked from scratch', text: 'Our gravies, breads and sauces are made in-house, every single day.' },
  { icon: HeartHandshake, title: 'Warm hospitality', text: 'We treat every guest like family — whether you dine in or order home.' },
  { icon: Leaf, title: 'Something for everyone', text: 'Clear labels for vegetarian, vegan and gluten-free dishes and allergens.' },
];

export default function About() {
  const { settings } = useApp();
  return (
    <div className="container">
      <PageHeader eyebrow="About us" title={`The story of ${settings.name}`} subtitle={settings.tagline} />
      <section className="about-split">
        <Img src={IMAGES.interior} alt="The dining room" className="about-img" />
        <div className="prose">
          <h2>From a 12-table kitchen to your neighbourhood favourite</h2>
          <p>
            We opened our doors on Park Street in 2015 with a simple idea: serve the food we grew up eating, made with
            care and the best ingredients we could find. Our menu has grown since then — wood-fired pizzas, fresh bowls and
            house-made desserts now sit next to the butter chicken that started it all.
          </p>
          <p>
            Today our team of 30 cooks, servers and delivery partners serves thousands of guests every month across
            our two locations. Whether you’re celebrating a birthday or ordering in on a rainy evening, we’re here for you.
          </p>
          <div className="btn-row">
            <Link to="/reservations" className="btn btn-primary">Book a table</Link>
            <Link to="/menu" className="btn btn-ghost">See the menu</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="center">What we stand for</h2>
        <div className="values-grid">
          {VALUES.map((v) => (
            <div key={v.title} className="card value-card">
              <div className="service-icon"><v.icon size={22} /></div>
              <h3>{v.title}</h3>
              <p className="muted">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section gallery">
        <Img src={IMAGES.terrace} alt="Our outdoor terrace" />
        <Img src={IMAGES.thali} alt="A spread of signature dishes" />
        <Img src={IMAGES.dining} alt="Tables set for dinner" />
      </section>
    </div>
  );
}
