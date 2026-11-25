import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Rendering every owner page catches runtime references that a build alone misses.
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom' });
try {
  for (const name of ['Dashboard', 'Properties', 'AddProperty', 'Issues', 'Notifications', 'Policy', 'Profile', 'Subscription']) {
    const module = await server.ssrLoadModule('/src/dashboards/owner/pages/' + name + '.jsx');
    const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(module.default, {})));
    if (!html) throw new Error(name + ' did not render');
    if (/>\s*(apartment|check_circle|material-icons)\s*</.test(html)) throw new Error(name + ' displays icon names');
    console.log(name + ': rendered');
  }
} finally { await server.close(); }
