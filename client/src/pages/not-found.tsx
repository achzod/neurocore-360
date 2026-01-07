import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />
      <main className="flex items-center justify-center py-24">
        <div className="relative w-full max-w-2xl mx-4 text-center">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#FCDD00]/5 rounded-full blur-[150px]" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-sm bg-[#FCDD00]/10 border border-[#FCDD00]/20 mb-8">
              <AlertCircle className="h-10 w-10 text-[#FCDD00]" />
            </div>

            <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-4">
              [ ERREUR 404 ]
            </p>

            <h1 className="text-white text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.04em] mb-6">
              Page introuvable
            </h1>

            <p className="text-white/50 text-lg mb-12 max-w-md mx-auto">
              La page que tu cherches n'existe pas ou a été déplacée.
            </p>

            <Link href="/">
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-sm bg-[#FCDD00] text-black font-semibold hover:bg-[#FCDD00]/90 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Retour à l'accueil
              </button>
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
