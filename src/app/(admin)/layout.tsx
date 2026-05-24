"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import SwipeNavigator from "@/components/SwipeNavigator";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <PageTransition>
        <SwipeNavigator>
          <div className="pb-20">{children}</div>
        </SwipeNavigator>
      </PageTransition>
      <BottomNav />
    </ProtectedRoute>
  );
}
