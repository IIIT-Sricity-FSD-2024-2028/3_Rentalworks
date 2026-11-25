import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '32px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '480px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            <span className="material-icons-outlined" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px' }}>
              warning_amber
            </span>
            <h3 style={{ fontSize: '20px', color: '#111827', marginBottom: '8px' }}>Something went wrong</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 20px',
                background: '#1a7a4a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
