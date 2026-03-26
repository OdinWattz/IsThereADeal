import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0c14',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '600px',
            backgroundColor: '#111320',
            border: '1px solid #1e2235',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#ef4444', marginBottom: '16px', fontSize: '24px' }}>
              Oeps! Er ging iets mis
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
              De app heeft een fout tegengekomen en kon niet verder laden.
            </p>
            {this.state.error && (
              <pre style={{
                backgroundColor: '#0d0f1a',
                border: '1px solid #1e2235',
                borderRadius: '8px',
                padding: '16px',
                color: '#ef4444',
                fontSize: '12px',
                textAlign: 'left',
                overflow: 'auto',
                marginBottom: '24px'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => window.location.href = '/'}
              style={{
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Terug naar Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
