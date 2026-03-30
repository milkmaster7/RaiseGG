'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d0d1a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '480px' }}>
          {/* Logo mark */}
          <div
            style={{
              fontSize: '3rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #7b61ff 0%, #00e5ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
              letterSpacing: '0.05em',
            }}
          >
            RaiseGG
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 0 0.75rem 0',
              color: '#ffffff',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: '0.95rem',
              color: '#8b8b9e',
              lineHeight: 1.6,
              margin: '0 0 2rem 0',
            }}
          >
            An unexpected error occurred. This has been logged. Click below to reload the page.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #7b61ff 0%, #6046e5 100%)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => ((e.target as HTMLButtonElement).style.opacity = '0.85')}
              onMouseOut={(e) => ((e.target as HTMLButtonElement).style.opacity = '1')}
            >
              Try Again
            </button>

            <a
              href="/"
              style={{
                padding: '0.75rem 2rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#ffffff',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
