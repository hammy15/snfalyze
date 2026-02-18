import Link from 'next/link';

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-6xl font-bold text-neutral-300 mb-4">404</div>
      <h1 className="text-2xl font-semibold text-neutral-800 mb-2">Page Not Found</h1>
      <p className="text-neutral-500 mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/app/deals"
        className="neu-button-primary px-6 py-2.5 rounded-xl text-sm font-medium"
      >
        Back to Deal Pipeline
      </Link>
    </div>
  );
}
