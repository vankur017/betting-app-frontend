import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { env } from './config/env';
import './index.css';
import { installSoundUnlock } from './lib/sound';

document.title = `${env.appName} — Play-money arcade`;

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

installSoundUnlock();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
