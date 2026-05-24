"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="pb-20">{children}</div>
      </PageTransition>
      <BottomNav />
    </ProtectedRoute>
  );
}
