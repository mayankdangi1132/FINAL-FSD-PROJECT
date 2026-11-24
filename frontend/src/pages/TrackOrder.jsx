import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

/** Orders are linked to customer accounts, so tracking happens from "My account". */
export default function TrackOrder() {
  const { user } = useApp();
  if (user?.role === 'customer') return <Navigate to="/account?tab=orders" replace />;
  return <Navigate to="/login" replace state={{ from: '/account?tab=orders', message: 'Sign in to see and track your orders.' }} />;
}
