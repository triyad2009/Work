import React from 'react';
import ReactDOM from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import App from './App';
import './styles.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error('Work app error:', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="center">
        <div className="setup-card">
          <div className="logo">W</div>
          <h1>Work could not load</h1>
          <p>Please refresh the page. If this continues, open the browser console and share the error.</p>
          <code>{String(this.state.error?.message || this.state.error)}</code>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </React.StrictMode>
);
