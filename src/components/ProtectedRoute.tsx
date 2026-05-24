"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Skeleton from "@/components/Skeleton";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      setRedirecting(true);
      router.replace("/login");
    }
  }, [loading, currentUser, router]);

  if (loading) {
    return (
      <div className="flex min-h-full flex-col gap-4 px-6 pt-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-full flex-col gap-4 px-6 pt-8">
        <Skeleton className="h-8 w-48" />
        <p className="text-sm text-gray-400">Redirigiendo al inicio de sesión...</p>
      </div>
    );
  }

  return <>{children}</>;
}
