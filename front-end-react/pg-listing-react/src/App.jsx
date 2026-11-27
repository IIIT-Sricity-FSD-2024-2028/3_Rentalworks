import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './app/store';
import { restoreSession, selectSessionStatus } from './features/auth/authSlice';
import AppRoutes from './routes/AppRoutes';
import ToastHost from './components/ToastHost';
import ScrollToTop from './components/ScrollToTop';
import './index.css';

function SessionRoutes() {
  const dispatch = useDispatch();
  const status = useSelector(selectSessionStatus);

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (status === 'failed') {
    return (
      <main className="session-status">
        <p role="alert">Could not check your sign-in. Make sure the backend is running.</p>
        <button type="button" onClick={() => dispatch(restoreSession())}>Retry</button>
      </main>
    );
  }
  if (status !== 'ready') {
    return <main className="session-status" role="status">Checking your sign-in…</main>;
  }
  return <AppRoutes />;
}

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
        <SessionRoutes />
        <ToastHost />
      </BrowserRouter>
    </Provider>
  );
}
