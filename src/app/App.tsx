import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { App as CompatibilityApp } from '../App';
import { env } from '../infrastructure/config/env';
import { configureApplicationProviders } from './providers';

configureApplicationProviders();

export function App() {
  if (env.dataMode === 'api') {
    return <div className="app"><main><div className="content"><section className="panel"><div className="panel-title"><h1>API mode is configured</h1></div><div className="empty">The provisional HTTP adapters are ready for a backend contract, but this repository does not include a backend. Demo mode is required to run the application.</div></section></div></main></div>;
  }
  return <BrowserRouter><Routes><Route path="/" element={<Navigate to="/overview" replace />} /><Route path="*" element={<CompatibilityApp />} /></Routes></BrowserRouter>;
}
