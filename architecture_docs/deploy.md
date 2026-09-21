# Deploy — Neon (banco), Render (backend), Vercel (frontend)

Ordem obrigatória: **banco → backend → frontend**. O backend precisa da URL do Postgres
antes de subir; o frontend precisa da URL pública do backend; no fim, o backend precisa
conhecer o domínio da Vercel (CORS/CSRF).

Contas gratuitas bastam. Não use gunicorn: o chat e a sincronização da sala passam por
WebSocket (`/ws/`), que só funciona em ASGI (Daphne). O backend **não** pode ir para a
Vercel.

Resumo dos arquivos já no repositório:

- Banco: `DATABASE_URL` lida em `backend/config/settings.py`
- Backend: `backend/start.sh`, `backend/Procfile`, `backend/runtime.txt`, `render.yaml`
- Frontend: pasta `frontend/`, `frontend/vercel.json`

---

## 1. Banco — Neon

1. Crie uma conta em [neon.tech](https://neon.tech) e um projeto (região perto do Render,
   em geral `São Paulo` ou `US East`).
2. Crie um banco (o default `neondb` serve).
3. Em **Dashboard → Connection details**, copie a connection string **URI**.
   Use o host do pooler se o Neon oferecer (`-pooler` no hostname).
4. A URL precisa de SSL. Se não vier `sslmode`, acrescente:

   ```
   postgresql://USER:PASSWORD@HOST/DB?sslmode=require
   ```

5. Guarde essa URL. Ela vira `DATABASE_URL` no Render. Não commite.

O Neon free suspende o compute depois de inatividade. A primeira request depois do sono
demora alguns segundos; as seguintes ficam normais.

`backend/start.sh` já roda `migrate` na subida. Não precisa criar tabelas à mão.

---

## 2. Backend — Render

1. Envie o repositório para o GitHub (se ainda não estiver).
2. Em [render.com](https://render.com) → **New → Blueprint**, aponte o repo. O Render lê
   `/render.yaml` (serviço `fortuna-api`, `rootDir: backend`, start `bash start.sh`).
3. Se preferir criar o Web Service na mão, sem Blueprint:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3.13
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `bash start.sh`
   - **Instâncias:** **1** (channel layer em memória; duas instâncias quebram o WebSocket)
   - **Não** escolha gunicorn / WSGI
4. Variáveis de ambiente (Environment):

   | Variável | Valor |
   |---|---|
   | `DJANGO_DEBUG` | `false` |
   | `DJANGO_SECRET_KEY` | string longa aleatória (o Blueprint pode gerar) |
   | `DATABASE_URL` | URI do Neon (passo 1) |
   | `DJANGO_ALLOWED_HOSTS` | hostname do Render, sem `https://` — ex. `fortuna-api.onrender.com` |
   | `CORS_ALLOWED_ORIGINS` | URL da Vercel com `https://`, sem barra no fim — ex. `https://fortuna.vercel.app` |
   | `CSRF_TRUSTED_ORIGINS` | as duas origens HTTPS: `https://fortuna.vercel.app,https://fortuna-api.onrender.com` |
   | `CORS_ALLOWED_ORIGIN_REGEXES` | opcional, para previews: `https://.*\.vercel\.app` |

   Na primeira publicação a URL da Vercel ainda não existe: coloque um placeholder
   (`https://placeholder.vercel.app`) e volte aqui no passo 4 depois do frontend.
5. Deploy. O `start.sh` faz migrate + collectstatic + `daphne -b 0.0.0.0 -p $PORT`.
6. Confira:
   - `https://<seu-serviço>.onrender.com/api/health/` → `{"status":"ok"}`
   - Não use a porta 8000 na URL pública; o Render injeta `$PORT`.

Plano free do Render dorme ~15 min sem tráfego. A primeira abertura acorda o serviço
(30–60 s). O WebSocket cai nesse sono; o cliente reconecta sozinho.

Domínio customizado do backend: acrescente o host em `DJANGO_ALLOWED_HOSTS` e a origem
`https://...` em `CSRF_TRUSTED_ORIGINS`.

---

## 3. Frontend — Vercel

1. Em [vercel.com](https://vercel.com) → **Add New → Project**, importe o mesmo repo.
2. **Root Directory:** `frontend` (importante: o Next.js não está na raiz).
3. Framework: Next.js (o `frontend/vercel.json` já declara isso).
4. Variáveis de ambiente (Production e Preview):

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://fortuna-api.onrender.com` (sem barra no fim) |
   | `NEXT_PUBLIC_WS_URL` | `wss://fortuna-api.onrender.com` (`wss`, não `ws`) |
   | `NEXT_PUBLIC_SITE_URL` | URL canônica do site, ex. `https://fortuna.vercel.app` |

   `NEXT_PUBLIC_*` entra no bundle no build. Se errar a URL, faça **Redeploy** depois de
   corrigir — só editar a variável no dashboard não atualiza o JS antigo.
5. Deploy. Anote a URL (`https://….vercel.app` ou o domínio próprio).
6. Volte ao Render e ajuste `CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS` com essa URL
   (e o domínio customizado, se houver). Salve — o Render reinicia o serviço.

---

## 4. Conferência ponta a ponta

1. Abra o site na Vercel. A home carrega.
2. Crie uma sala. Deve ir para `/sala/<código>`.
3. No DevTools → Network, `GET /api/rooms/...` e o WebSocket `wss://…/ws/rooms/<código>/`
   devem ir para o Render, não para `localhost`.
4. Abra o link em outra aba (ou anônimo), entre com outro nome. Os dois aparecem na sala
   sem recarregar.
5. Abra uma mesa (Xadrez, Coup ou Batalha Naval) e jogue um lance/ação. O outro lado
   atualiza.
6. Se CORS falhar (`blocked by CORS`), a origem da Vercel não está em
   `CORS_ALLOWED_ORIGINS` (sem barra no fim, com `https://`).
7. Se o WS não conectar, confira `NEXT_PUBLIC_WS_URL` com `wss://` e o backend em Daphne
   (não gunicorn).

---

## 5. O que não fazer

- Não coloque o Django na Vercel (sem processo longo, sem WebSocket).
- Não use gunicorn / `config.wsgi` no Render.
- Não suba mais de uma instância do backend no plano atual (InMemoryChannelLayer).
- Não commite `.env` nem a URI do Neon.
- Não deixe `DJANGO_DEBUG=true` em produção.

Redis (Upstash) só entra se um dia houver mais de um worker — aí o `CHANNEL_LAYERS` em
`settings.py` troca de memória para Redis.
