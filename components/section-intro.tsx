export function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="section-heading">
      <div>
        <span className="badge" style={{ marginBottom: 12 }}>{eyebrow}</span>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', margin: 0, letterSpacing: '-0.05em' }}>{title}</h2>
      </div>
      <p style={{ maxWidth: 520, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{copy}</p>
    </div>
  );
}
