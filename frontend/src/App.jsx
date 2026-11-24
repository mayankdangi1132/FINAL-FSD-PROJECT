import { Route, Routes } from 'react-router-dom';
import { Loader2, ServerCrash } from 'lucide-react';
import { useApp } from './context/AppContext.jsx';
import { DashboardLayout, PublicLayout, RequireRole, Toasts } from './components/Layouts.jsx';

import Home from './pages/Home.jsx';
import Menu from './pages/Menu.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderTracking from './pages/OrderTracking.jsx';
import TrackOrder from './pages/TrackOrder.jsx';
import Reservations from './pages/Reservations.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import { Login, Register } from './pages/Auth.jsx';
import NotFound from './pages/NotFound.jsx';
import CustomerDashboard from './pages/customer/CustomerDashboard.jsx';

import AdminOverview from './pages/admin/AdminOverview.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminMenu from './pages/admin/AdminMenu.jsx';
import AdminReservations from './pages/admin/AdminReservations.jsx';
import AdminStaff from './pages/admin/AdminStaff.jsx';
import AdminPromotions from './pages/admin/AdminPromotions.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AdminActivity from './pages/admin/AdminActivity.jsx';
import KitchenDashboard from './pages/kitchen/KitchenDashboard.jsx';
import FohDashboard from './pages/foh/FohDashboard.jsx';

function BootScreen({ boot }) {
  if (boot.status === 'loading') {
    return (
      <div className="boot-screen">
        <Loader2 size={32} className="spin" />
        <p className="muted">Loading Saffron Table…</p>
      </div>
    );
  }
  return (
    <div className="boot-screen">
      <ServerCrash size={40} />
      <h1>Can't reach the server</h1>
      <p className="muted">{boot.error}</p>
      <p className="muted small">Start everything with <code>npm run dev</code> in the project folder, then reload this page.</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
    </div>
  );
}

export default function App() {
  const { boot } = useApp();
  if (boot.status !== 'ready') return <BootScreen boot={boot} />;
  return (
    <>
      <Routes>
        {/* Public website */}
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="menu" element={<Menu />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order/:id" element={<OrderTracking />} />
          <Route path="track" element={<TrackOrder />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="account" element={<RequireRole roles={['customer']}><CustomerDashboard /></RequireRole>} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin / manager */}
        <Route path="admin" element={<RequireRole roles={['admin']}><DashboardLayout /></RequireRole>}>
          <Route index element={<AdminOverview />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="menu" element={<AdminMenu />} />
          <Route path="promotions" element={<AdminPromotions />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="activity" element={<AdminActivity />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Kitchen staff (admins can view too) */}
        <Route path="kitchen" element={<RequireRole roles={['kitchen', 'admin']}><DashboardLayout /></RequireRole>}>
          <Route index element={<KitchenDashboard />} />
        </Route>

        {/* Front-of-house staff (admins can view too) */}
        <Route path="foh" element={<RequireRole roles={['foh', 'admin']}><DashboardLayout /></RequireRole>}>
          <Route index element={<FohDashboard />} />
        </Route>
      </Routes>
      <Toasts />
    </>
  );
}
