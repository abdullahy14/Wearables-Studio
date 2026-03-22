'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { DesignElement } from '@/lib/types';

export function DesignEditor({
  onSave,
}: {
  onSave: (payload: { title: string; imageUrl: string; elements: DesignElement[]; isPublished: boolean }) => Promise<void>;
}) {
  const [title, setTitle] = useState('Studio Signature');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80');
  const [publish, setPublish] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [elements, setElements] = useState<DesignElement[]>([
    { id: crypto.randomUUID(), type: 'text', content: 'Wearables Studio', x: 64, y: 120, color: '#0B0B0B', fontSize: 24 },
  ]);

  const selected = useMemo(() => elements.find((entry) => entry.id === selectedId) ?? null, [elements, selectedId]);

  const addText = () => {
    setElements((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: 'text', content: 'New Text', x: 96, y: 180, color: '#8A8A8A', fontSize: 20 },
    ]);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      setElements((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: 'image', content: result, x: 112, y: 200, width: 96, height: 96 },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const updateSelected = (patch: Partial<Extract<DesignElement, { type: 'text' }>>) => {
    if (!selectedId) return;
    setElements((prev) => prev.map((entry) => (entry.id === selectedId && entry.type === 'text' ? { ...entry, ...patch } : entry)));
  };

  const moveElement = (id: string, axis: 'x' | 'y', delta: number) => {
    setElements((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [axis]: Math.max(0, Math.min(260, entry[axis] + delta)) } : entry)),
    );
  };

  return (
    <div className="editor-layout">
      <aside className="editor-panel panel">
        <div>
          <label>Design title</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <label>Mockup image</label>
          <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        </div>
        <div className="button-row">
          <button className="ghost-button" type="button" onClick={addText}>Add Text</button>
          <label className="ghost-button upload-button">
            Upload Art
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </label>
        </div>
        {selected?.type === 'text' && (
          <div className="editor-controls">
            <label>Text content</label>
            <input value={selected.content} onChange={(event) => updateSelected({ content: event.target.value })} />
            <label>Text color</label>
            <input type="color" value={selected.color} onChange={(event) => updateSelected({ color: event.target.value })} />
            <label>Font size</label>
            <input type="range" min={14} max={64} value={selected.fontSize} onChange={(event) => updateSelected({ fontSize: Number(event.target.value) })} />
          </div>
        )}
        <div>
          <label className="checkbox-row">
            <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /> Publish to marketplace
          </label>
        </div>
        <button className="primary-button" type="button" onClick={() => onSave({ title, imageUrl, elements, isPublished: publish })}>
          Save Design
        </button>
      </aside>

      <section className="editor-canvas panel">
        <div className="tee-frame" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.7), rgba(255,255,255,.8)), url(${imageUrl})` }}>
          <div className="tee-shape" />
          {elements.map((element) => (
            <button
              key={element.id}
              type="button"
              className={`design-layer ${element.type === 'image' ? 'image-layer' : ''} ${selectedId === element.id ? 'selected' : ''}`}
              style={
                element.type === 'text'
                  ? { left: element.x, top: element.y, color: element.color, fontSize: element.fontSize }
                  : { left: element.x, top: element.y, width: element.width, height: element.height, backgroundImage: `url(${element.content})` }
              }
              onClick={() => setSelectedId(element.id)}
            >
              {element.type === 'text' ? element.content : null}
            </button>
          ))}
        </div>
        <div className="move-grid">
          {selectedId ? (
            <>
              <button type="button" onClick={() => moveElement(selectedId, 'y', -8)}>↑</button>
              <div>
                <button type="button" onClick={() => moveElement(selectedId, 'x', -8)}>←</button>
                <button type="button" onClick={() => moveElement(selectedId, 'x', 8)}>→</button>
              </div>
              <button type="button" onClick={() => moveElement(selectedId, 'y', 8)}>↓</button>
            </>
          ) : (
            <p className="muted">Select a layer to reposition it.</p>
          )}
        </div>
      </section>
    </div>
  );
}
