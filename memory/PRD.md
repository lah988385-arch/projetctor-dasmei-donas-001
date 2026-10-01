# PRD — PGMEI (Clone de Estudo) · Tela Inicial

## Atualização (01/10/2026) — Próxima página (dados do contribuinte) + consulta por CNPJ
- Nova página `/app/frontend/public/pgmei2.html` (HTML original enviado pelo usuário), servida após o "Continuar".
- Ao enviar um CNPJ válido na home, o botão mantém o spinner e navega para `/pgmei2.html?cnpj=DIGITOS`.
- A página 2 preenche **CNPJ** e **Nome** chamando o novo endpoint `GET /api/consulta-cnpj/{cnpj}`.
- Backend (`server.py`): endpoint consulta a **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, pública, sem chave) via httpx; retorna razão social real; fallback "Contribuinte não localizado" para CNPJ inexistente/erro. Registra em `db.consultas`.
- Testado (testing_agent iteration_4): backend 100% (5/5), frontend 100%. BrasilAPI ao vivo retornando nomes reais.

## Atualização (01/10/2026) — HTML original como página inicial
- A página inicial agora usa o **arquivo HTML original salvo da Receita** (SingleFile), servido em `/app/frontend/public/pgmei.html`, garantindo fidelidade 100%.
- `PGMEIHome.tsx` renderiza um `<iframe src="/pgmei.html">` em tela cheia, isolando o Bootstrap 3 do CSS/Tailwind do React.
- Script injetado no fim do `pgmei.html`: máscara do CNPJ, validação de 14 dígitos, spinner no botão "Continuar" e POST para `/api/identificacao` (mesma origem). Exibe alerta de sucesso/erro abaixo do form.
- Removida a meta tag `content-security-policy` original (bloqueava o fetch via `default-src 'none'`).
- hCaptcha permanece apenas visual (mock). Testado no browser: CNPJ válido → sucesso, inválido → erro. OK.


## Problema original
Reconstrução fiel, para estudo de front-end, da tela inicial do PGMEI (entrada de CNPJ → Continuar). Uso pessoal/aprendizado. Não publicado como página do governo. Geração real de DAS (Integra Contador/SERPRO) fora deste escopo.

## Decisões do usuário
- Fidelidade visual: **100% idêntico ao original** (Receita Federal, Bootstrap 3)
- Resposta do "Continuar": **mock simples** (apenas a tela inicial)
- Captcha: **checkbox mock "Não sou um robô"**
- Histórico de CNPJs: **gravação silenciosa no MongoDB** (sem tela de listagem)

## Arquitetura
- Frontend: React + TypeScript (CRA + craco). CSS do Bootstrap 3 internalizado em `src/styles/pgmei.css` (sem CDN externo).
- Backend: FastAPI — `POST /api/identificacao` valida CNPJ, grava e retorna mock.
- Banco: MongoDB, coleção `identificacoes` (registro de estudo).

## Persona
- Estudante/dev de front-end reproduzindo a UI do PGMEI para aprendizado.

## Requisitos centrais (estáticos)
- Header com faixa verde + título "PGMEI - Programa Gerador de DAS do Microempreendedor Individual"
- Card central: label "CNPJ completo:" + input, captcha mock, botão verde "Continuar" (spinner estilo Ladda)
- Footer com versão + selo
- Máscara automática `00.000.000/0000-00`
- Validação dos dígitos verificadores antes de habilitar "Continuar"
- Mensagem de erro para CNPJ inválido
- Botão desabilita + spinner ao submeter (evita duplo clique)
- Sem lixo externo (hCaptcha real, scripts IE maxcdn, tracking)

## Implementado (2026-10-01)
- Tela inicial fiel (header verde, card Bootstrap 3, footer versão/selo) — `PGMEIHome.tsx`
- Máscara + validação de CNPJ em tempo real — `utils/cnpj.ts`
- Captcha mock (checkbox) controlando habilitação do botão
- Botão "Continuar" com loading/spinner Ladda
- Backend `POST /api/identificacao` (valida dígitos, grava em `identificacoes`, retorna mock) — `server.py`
- Testado: backend 8/8 pytest + frontend e2e (testing agent) — 100%

## Backlog priorizado
- P1: Tela seguinte do fluxo (apuração/geração de DAS — mock)
- P2: Login/conta para salvar CNPJs
- P2: Tela de histórico dos CNPJs submetidos
- P2 (futuro/fora de escopo atual): Integração real via Integra Contador (SERPRO) — exige certificado/contrato
- P2: Dar marca própria (sair da cara da Receita)

## Próximas tarefas
- Definir dados fake da próxima tela (se evoluir o fluxo)
- Decidir se mantém 100% idêntico ou começa a dar cara própria
