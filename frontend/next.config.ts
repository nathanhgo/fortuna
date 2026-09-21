import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Um único .env na raiz do repositório, compartilhado com o backend e com o docker-compose —
// não um .env por serviço (ver ../.env.example). Ao rodar via Docker, as variáveis já chegam
// diretamente no ambiente do container via `env_file`; isso aqui cobre quem roda o frontend
// fora de container (npm run dev local, sem Docker).
// O 4º argumento (forceReload=true) é necessário: o próprio Next.js já chamou loadEnvConfig
// internamente para frontend/ antes de carregar este arquivo, e a implementação cacheia esse
// resultado — sem forceReload, esta chamada simplesmente devolveria o cache (sem o .env raiz).
loadEnvConfig(path.join(__dirname, ".."), process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
