import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ProtectedRoute from '@/components/dashboard/ProtectedRoute';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
