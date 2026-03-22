'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { SHIRT_PRICE } from '@/lib/constants';
import { randomId } from '@/lib/utils';
import { DesignLayer } from '@/lib/types';

const mockupImage = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80';

export function DesignStudio({ creatorId }: { creatorId: string }) {
  const [title, setTitle] = useState('Studio Minimal 01');
  const [description, setDescription] = useState('Luxury monochrome front print');
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedDesignId, setSavedDesignId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const activeLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? null,
    [activeLayerId, layers]
  );

  function addTextLayer() {
    const newLayer: DesignLayer = {
      id: randomId('layer'),
      type: 'text',
      value: 'Wearables Studio',
      x: 110,
      y: 120,
      fontSize: 24,
      color: '#0B0B0B'
    };
    setLayers((current) => [...current, newLayer]);
    setActiveLayerId(newLayer.id);
  }

  function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newLayer: DesignLayer = {
        id: randomId('layer'),
        type: 'image',
        value: reader.result as string,
        x: 120,
        y: 180,
        width: 120,
        height: 120
      };
      setLayers((current) => [...current, newLayer]);
      setActiveLayerId(newLayer.id);
    };
    reader.readAsDataURL(file);
  }

  function beginDrag(event: React.PointerEvent<HTMLDivElement>, layerId: string) {
    const layer = layers.find((item) => item.id === layerId);
    const canvas = canvasRef.current;
    if (!layer || !canvas) return;

    setActiveLayerId(layerId);
    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = layer.x;
    const originY = layer.y;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextX = originX + moveEvent.clientX - startX;
      const nextY = originY + moveEvent.clientY - startY;
      setLayers((current) =>
        current.map((item) =>
          item.id === layerId
            ? {
                ...item,
                x: Math.max(0, Math.min(rect.width - 40, nextX)),
                y: Math.max(0, Math.min(rect.height - 40, nextY))
              }
            : item
        )
      );
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  async function saveDesign() {
    setSaving(true);
    const response = await fetch('/api/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        imageUrl: mockupImage,
        price: SHIRT_PRICE,
        isPublished: true,
        creatorId,
        layers
      })
    });

    const payload = (await response.json()) as { id: string };
    setSavedDesignId(payload.id);
    setSaving(false);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 360px) minmax(0, 1fr)', gap: 24 }}>
      <div className="surface-card" style={{ padding: 24, display: 'grid', gap: 16, alignSelf: 'start' }}>
        <div>
          <p className="badge">Design controls</p>
          <h1 style={{ margin: '14px 0 6px', fontSize: 34, letterSpacing: '-0.05em' }}>Luxury design studio</h1>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            Upload artwork, add typography, reposition assets, and save a premium-ready design with a linked QR.
          </p>
        </div>
        <label>
          <span>Design title</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          <span>Description</span>
          <textarea className="textarea" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div style={{ display: 'grid', gap: 12 }}>
          <button className="btn" onClick={addTextLayer}>Add text layer</button>
          <label className="btn-secondary" style={{ textAlign: 'center' }}>
            Upload image
            <input type="file" accept="image/*" hidden onChange={uploadImage} />
          </label>
        </div>
        {activeLayer ? (
          <div className="surface-card" style={{ padding: 16, background: 'var(--surface)' }}>
            <p style={{ marginTop: 0, fontWeight: 600 }}>Selected layer</p>
            {activeLayer.type === 'text' ? (
              <>
                <input
                  className="input"
                  value={activeLayer.value}
                  onChange={(event) =>
                    setLayers((current) =>
                      current.map((item) =>
                        item.id === activeLayer.id ? { ...item, value: event.target.value } : item
                      )
                    )
                  }
                />
                <input
                  className="input"
                  type="color"
                  value={activeLayer.color}
                  onChange={(event) =>
                    setLayers((current) =>
                      current.map((item) =>
                        item.id === activeLayer.id ? { ...item, color: event.target.value } : item
                      )
                    )
                  }
                  style={{ marginTop: 12 }}
                />
              </>
            ) : (
              <p style={{ color: 'var(--muted)', marginBottom: 0 }}>Drag the image to reposition it on the tee.</p>
            )}
          </div>
        ) : null}
        <button className="btn" onClick={saveDesign} disabled={saving}>
          {saving ? 'Saving design...' : 'Save & publish design'}
        </button>
        {savedDesignId ? (
          <div className="surface-card" style={{ padding: 20, textAlign: 'center', background: 'var(--surface)' }}>
            <p className="badge">Design QR</p>
            <div style={{ marginTop: 12, display: 'grid', placeItems: 'center' }}>
              <QRCodeSVG value={`${window.location.origin}/designs/${savedDesignId}`} size={140} bgColor="#FFFFFF" fgColor="#0B0B0B" />
            </div>
            <p style={{ color: 'var(--muted)' }}>Design saved. Share or scan to open the live design page.</p>
          </div>
        ) : null}
      </div>

      <div className="surface-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p className="badge">Mockup preview</p>
            <h2 style={{ fontSize: 30, margin: '10px 0 0' }}>{title}</h2>
          </div>
          <span style={{ color: 'var(--muted)' }}>Drag layers directly on the tee</span>
        </div>
        <div ref={canvasRef} style={{ position: 'relative', aspectRatio: '4 / 5', overflow: 'hidden', borderRadius: 28, background: '#f8f8f8' }}>
          <Image src={mockupImage} alt="T-shirt mockup" fill style={{ objectFit: 'cover' }} priority />
          <div style={{ position: 'absolute', inset: '12% 18% 22%', borderRadius: 24 }}>
            {layers.map((layer) => (
              <div
                key={layer.id}
                role="button"
                tabIndex={0}
                onPointerDown={(event) => beginDrag(event, layer.id)}
                onClick={() => setActiveLayerId(layer.id)}
                style={{
                  position: 'absolute',
                  top: layer.y,
                  left: layer.x,
                  cursor: 'grab',
                  outline: activeLayerId === layer.id ? '1px dashed rgba(11,11,11,0.4)' : 'none',
                  padding: 4,
                  borderRadius: 8
                }}
              >
                {layer.type === 'text' ? (
                  <span style={{ fontSize: layer.fontSize, fontWeight: 600, color: layer.color }}>{layer.value}</span>
                ) : (
                  <img src={layer.value} alt="Uploaded design asset" style={{ width: layer.width, height: layer.height, objectFit: 'cover', borderRadius: 12 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
