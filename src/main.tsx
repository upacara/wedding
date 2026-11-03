import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Admin from './Admin.tsx'

function Router() {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => {
      setRoute(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  if (route.startsWith('#/admin')) return <Admin />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
