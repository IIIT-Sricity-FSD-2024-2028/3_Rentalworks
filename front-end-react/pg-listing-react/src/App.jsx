import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import AppRoutes from './routes/AppRoutes';
import ToastHost from './components/ToastHost';
import ScrollToTop from './components/ScrollToTop';
import './index.css';

/**
 * main.jsx → <App>
 *   <Provider store>            Redux Toolkit store (auth, booking, listings, dashboards…)
 *     <BrowserRouter>
 *       <AppRoutes />           public discovery + role-protected dashboards
 *       <ToastHost />           global notifications from the `ui` slice
 */
export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
        <ToastHost />
      </BrowserRouter>
    </Provider>
  );
}
