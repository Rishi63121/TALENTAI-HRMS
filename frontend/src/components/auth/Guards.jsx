import { Navigate, Outlet, useLocation } from 'react-router-dom';
import BrandLoader from '../feedback/BrandLoader';
import { ForbiddenPage } from '../feedback/ErrorState';
import { ROLE_HOME, useAuth } from '../../context/AuthContext';

/** Only signed-in users with one of `roles` get through. Others see a clear explanation or the login page. */
export function RequireAuth({ roles }) {
  const { isAuthenticated, checking, role } = useAuth();
  const location = useLocation();

  if (checking) return <BrandLoader title="TalentAI" messages={['Checking your session', 'Securing your workspace', 'Almost there']} />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(role)) return <ForbiddenPage />;
  return <Outlet />;
}

/** Login/register are for signed-out users only. */
export function PublicOnly({ children }) {
  const { isAuthenticated, checking, role } = useAuth();
  if (checking) return <BrandLoader messages={['Checking your session', 'Almost there']} />;
  if (isAuthenticated) return <Navigate to={ROLE_HOME[role] || '/login'} replace />;
  return children;
}

/** "/" sends people to wherever they belong. */
export function HomeRedirect() {
  const { isAuthenticated, checking, role } = useAuth();
  if (checking) return <BrandLoader />;
  return <Navigate to={isAuthenticated ? ROLE_HOME[role] || '/login' : '/login'} replace />;
}
