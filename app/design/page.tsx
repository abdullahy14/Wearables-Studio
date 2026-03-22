import { DesignStudio } from '@/components/design-studio';
import { getSession } from '@/lib/auth';

export default async function DesignPage() {
  const session = await getSession();
  const creatorId = session?.id ?? 'creator-1';

  return (
    <div className="container">
      <DesignStudio creatorId={creatorId} />
    </div>
  );
}
