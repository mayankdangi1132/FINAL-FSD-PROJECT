import { useState } from 'react';
import { Clock, Mail, MapPin, Navigation, Phone, Send } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { DAY_NAMES, formatTime12 } from '../utils/format.js';
import { Field, PageHeader } from '../components/ui.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Contact() {
  const { settings, toast } = useApp();
  const [form, setForm] = useState({ name: '', email: '', subject: 'General enquiry', message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const set = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => (er[name] ? { ...er, [name]: undefined } : er));
  };
  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (form.name.trim().length < 2) err.name = 'Please enter your name.';
    if (!EMAIL_RE.test(form.email.trim())) err.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) err.message = 'Message should be at least 10 characters.';
    setErrors(err);
    if (Object.keys(err).length) return;
    setSent(true);
    toast("Thanks! We'll reply within 24 hours.");
  };

  return (
    <div className="container">
      <PageHeader eyebrow="Get in touch" title="Contact us" subtitle="Questions, feedback, private events or catering — we'd love to hear from you." />
      <div className="contact-cards">
        <div className="card contact-card"><Phone size={22} /><h3>Call us</h3><a href={`tel:${settings.phone.replace(/\s/g, '')}`}>{settings.phone}</a></div>
        <div className="card contact-card"><Mail size={22} /><h3>Email</h3><a href={`mailto:${settings.email}`}>{settings.email}</a></div>
        <div className="card contact-card"><Clock size={22} /><h3>Today</h3><span>{(() => { const h = Object.values(settings.hours)[(new Date().getDay() + 6) % 7]; return h.closed ? 'Closed' : `${formatTime12(h.open)} – ${formatTime12(h.close)}`; })()}</span></div>
      </div>

      <div className="two-col">
        <form className="card form-card" onSubmit={submit} noValidate>
          <h2 className="card-title">Send us a message</h2>
          {sent ? (
            <div className="alert alert-success">Thanks, {form.name.split(' ')[0]}! Your message has been sent. We'll get back to you at {form.email}.</div>
          ) : (
            <>
              <div className="form-grid">
                <Field label="Name" htmlFor="ct-name" error={errors.name} required><input id="ct-name" name="name" value={form.name} onChange={set} autoComplete="name" /></Field>
                <Field label="Email" htmlFor="ct-email" error={errors.email} required><input id="ct-email" name="email" type="email" value={form.email} onChange={set} autoComplete="email" /></Field>
              </div>
              <Field label="Subject" htmlFor="ct-subject">
                <select id="ct-subject" name="subject" value={form.subject} onChange={set}>
                  <option>General enquiry</option><option>Feedback</option><option>Private events & catering</option><option>Order issue</option><option>Careers</option>
                </select>
              </Field>
              <Field label="Message" htmlFor="ct-message" error={errors.message} required>
                <textarea id="ct-message" name="message" rows={5} value={form.message} onChange={set} />
              </Field>
              <button className="btn btn-primary"><Send size={16} /> Send message</button>
            </>
          )}
        </form>

        <aside className="stack">
          {settings.locations.map((l) => (
            <div key={l.id} className="card">
              <h2 className="card-title"><MapPin size={18} /> {l.name}</h2>
              <p className="muted">{l.address}</p>
              <p className="small"><Phone size={14} className="inline-icon" /> {l.phone}</p>
              <div className="chip-row">{l.services.map((s) => <span key={s} className="chip chip-sm">{s}</span>)}</div>
              <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address)}`} target="_blank" rel="noreferrer">
                <Navigation size={14} /> Get directions
              </a>
            </div>
          ))}
          <div className="card">
            <h2 className="card-title"><Clock size={18} /> Opening hours</h2>
            <ul className="hours-list">
              {Object.entries(settings.hours).map(([k, h]) => (
                <li key={k}><span>{DAY_NAMES[k]}</span><span>{h.closed ? 'Closed' : `${formatTime12(h.open)} – ${formatTime12(h.close)}`}</span></li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
