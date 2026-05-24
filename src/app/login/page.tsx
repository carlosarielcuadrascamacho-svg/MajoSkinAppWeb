"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/");
    } catch {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-8">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <Image
              src="/icons/icon-512.png"
              alt="MajoAdmin"
              width={80}
              height={80}
              className="h-20 w-20 rounded-3xl"
              priority
            />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-primary">
            MajoAdmin
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Inicia sesión para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-full border border-[#E5E5E5] bg-white px-5 py-3.5 text-base text-foreground outline-none transition placeholder:text-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-full border border-[#E5E5E5] bg-white px-5 py-3.5 text-base text-foreground outline-none transition placeholder:text-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          {error && (
            <p className="text-center text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-primary py-3.5 text-base font-semibold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
