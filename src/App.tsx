import { useEffect, useState, lazy, Suspense } from 'react';

const RankingTable = lazy(() => import('./components/RankingTable'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Login = lazy(() => import('./components/Login'));
const ManufacturerLanding = lazy(() => import('./components/ManufacturerLanding').then(m => ({ default: m.ManufacturerLanding })));
const December2025Snapshot = lazy(() => import('./components/December2025Snapshot'));
const PotentialClientForm = lazy(() => import('./components/PotentialClientForm').then(m => ({ default: m.PotentialClientForm })));
const PublicTaskView = lazy(() => import('./components/PublicTaskView').then(m => ({ default: m.PublicTaskView })));

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = localStorage.getItem('admin_logged_in') === 'true';
      setIsAuthenticated(loggedIn);
    };

    checkAuth();

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      checkAuth();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    setIsAuthenticated(false);
    window.history.pushState({}, '', '/admin');
    setCurrentPath('/admin');
  };

  return (
    <Suspense fallback={<div style={{ background: '#0a0a0a', minHeight: '100vh' }} />}>
      {(() => {
        if (currentPath === '/dic2025') {
          return <December2025Snapshot />;
        }

        if (currentPath === '/streamfabricantes') {
          return <ManufacturerLanding />;
        }

        if (currentPath === '/datos') {
          return <PotentialClientForm />;
        }

        if (currentPath.startsWith('/tarea/')) {
          const uuidPublico = currentPath.replace('/tarea/', '');
          const handleBack = () => {
            window.history.pushState({}, '', '/');
            setCurrentPath('/');
          };
          return <PublicTaskView uuidPublico={uuidPublico} onBack={handleBack} />;
        }

        if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
          if (!isAuthenticated) {
            return <Login onLoginSuccess={handleLoginSuccess} />;
          }
          const currentUser = localStorage.getItem('admin_username') || 'Tobias';
          const section = currentPath.replace('/admin/', '').replace('/admin', '') || 'overview';
          return <AdminPanel onLogout={handleLogout} currentUser={currentUser} initialSection={section} />;
        }

        return <RankingTable />;
      })()}
    </Suspense>
  );
}

export default App;
