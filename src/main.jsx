import React from 'react';
import { createRoot } from 'react-dom/client';

/* Fonts are bundled, not fetched. A demo must not depend on venue wifi. */
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-mono/400.css';

import App from './App.jsx';
import { handlePopupCallback } from './lib/auth.js';
import './styles/global.css';
import './styles/chooser.css';
import './styles/wallet.css';

/* When this document is the OAuth popup it hands the token back and closes,
   so there is nothing to render. */
if (!handlePopupCallback()) {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
