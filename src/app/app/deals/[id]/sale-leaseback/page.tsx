import { SaleLeasebackDashboard } from '@/components/sale-leaseback/SaleLeasebackDashboard';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SaleLeasebackPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="p-6">
      <SaleLeasebackDashboard dealId={id} />
    </div>
  );
}
