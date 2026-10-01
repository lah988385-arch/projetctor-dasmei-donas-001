# PRD — PGMEI (Clone de Estudo) · Tela Inicial

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
