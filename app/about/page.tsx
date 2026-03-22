export default function AboutPage() {
  return (
    <div className="container" style={{ display: 'grid', gap: 24 }}>
      <section className="surface-card" style={{ padding: 32 }}>
        <span className="badge">About Wearables Studio</span>
        <h1 style={{ fontSize: 48, letterSpacing: '-0.05em', marginBottom: 12 }}>A premium apparel workflow built for physical retail.</h1>
        <p style={{ color: 'var(--muted)', maxWidth: 760, lineHeight: 1.8 }}>
          This platform is designed around a store-first operations model: customers design and reserve products online, pay in person, and the cashier controls status updates from the admin dashboard.
        </p>
      </section>
    </div>
  );
}
