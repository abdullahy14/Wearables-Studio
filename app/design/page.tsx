import { redirect } from 'next/navigation';
import { createDesignAction } from '@/app/actions';
import { DesignEditor } from '@/components/DesignEditor';
import { SectionHeader } from '@/components/SectionHeader';
import { getCurrentUser } from '@/lib/auth';

export default async function DesignPage() {
  const user = await getCurrentUser();

  async function saveDesign(payload: Parameters<typeof createDesignAction>[0]) {
    'use server';
    await createDesignAction(payload);
    redirect('/creator-hub');
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Design Studio"
        title="Upload art, layer typography, and position every detail."
        description="Create premium T-shirt layouts with drag-free directional controls, clean text styling, and direct publishing into the creator marketplace."
      />
      {!user ? (
        <div className="panel">
          <p>Please log in to save a design. You can still explore the editor interface below.</p>
        </div>
      ) : null}
      <DesignEditor onSave={saveDesign} />
    </div>
  );
}
