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
import { CapiWardrobe } from './ui/CapiWardrobe';

try { if (window.self !== window.top) document.documentElement.dataset.framed = '1'; } catch { document.documentElement.dataset.framed = '1'; }

createRoot(document.getElementById('root')!).render(<StrictMode><CapiWardrobe><App /></CapiWardrobe></StrictMode>);
