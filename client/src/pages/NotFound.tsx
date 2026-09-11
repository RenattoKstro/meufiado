import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Página não encontrada | Meu Fiado";
  }, []);

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-slate-100 px-4">
      <Card className="w-full max-w-lg border-sky-100 bg-white/90 shadow-xl backdrop-blur-sm">
        <CardContent className="px-6 pb-8 pt-8 text-center sm:px-10">
          <div className="mb-6 flex items-center justify-center gap-3">
            <img
              src="/manus-storage/meu-fiado-favicon_e65e76fa.png"
              alt="Logo Meu Fiado"
              className="h-12 w-12 rounded-2xl shadow-sm"
            />
            <div className="text-left">
              <p className="text-lg font-bold tracking-tight text-slate-900">Meu Fiado</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">Painel de metas</p>
            </div>
          </div>

          <div className="mb-6 flex justify-center">
            <div className="relative rounded-full bg-red-50 p-4">
              <div className="absolute inset-0 animate-pulse rounded-full bg-red-100/70" />
              <AlertCircle className="relative h-12 w-12 text-red-500" aria-hidden="true" />
            </div>
          </div>

          <h1 className="mb-2 text-5xl font-bold tracking-tight text-slate-900">404</h1>

          <h2 className="mb-4 text-xl font-semibold text-slate-700">
            Página não encontrada
          </h2>

          <p className="mb-8 leading-relaxed text-slate-600">
            Não encontramos a página que você tentou acessar.
            <br />
            Ela pode ter sido movida ou o endereço pode estar incorreto.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
