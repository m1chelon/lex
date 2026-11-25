import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/aura.css';
import './styles/glass.css';
import './styles/study.css';
import './styles/atmosphere.css';
import './styles/capi-shop.css';
import { App } from './App';
import { initCloud } from './data/cloudSync';

try { if (window.self !== window.top) document.documentElement.dataset.framed = '1'; } catch { document.documentElement.dataset.framed = '1'; }

initCloud();

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
