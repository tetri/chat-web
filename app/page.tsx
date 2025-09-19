"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { app } from "@/lib/firebase"; // inicialização do firebase app

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        router.push("/chat");
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth, router]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  if (loading) return <p className="text-center mt-10">Carregando...</p>;

  if (user) return null; // já vai redirecionar para /chat

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Bem-vindo ao Chat!</h1>
      <button
        onClick={handleLogin}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Entrar com Google
      </button>
    </div>
  );
}
