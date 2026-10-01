from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
import uuid
from datetime import datetime, timezone, date, timedelta
import httpx


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class IdentificacaoRequest(BaseModel):
    cnpj: str


class IdentificacaoResponse(BaseModel):
    status: str
    valido: bool
    cnpj: str
    mensagem: str


class ConsultaCnpjResponse(BaseModel):
    cnpj: str
    cnpj_formatado: str
    nome: str
    situacao: Optional[str] = None
    encontrado: bool


class PeriodoApuracao(BaseModel):
    pa: str
    rotulo: str
    apurado: str
    situacao: str
    vencimento: str
    principal: str
    multa: str
    juros: str
    total: str
    data_vencimento: str
    data_acolhimento: str


class ApuracaoResponse(BaseModel):
    cnpj: str
    cnpj_formatado: str
    ano: int
    data_pagamento: str
    data_pagamento_inicio: str
    data_pagamento_fim: str
    periodos: List[PeriodoApuracao]


# ---------------------------------------------------------------------------
# CNPJ helpers (estudo)
# ---------------------------------------------------------------------------
def _only_digits(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def validar_cnpj(cnpj: str) -> bool:
    """Valida os dígitos verificadores do CNPJ (14 dígitos)."""
    num = _only_digits(cnpj)
    if len(num) != 14:
        return False
    if num == num[0] * 14:  # rejeita sequências repetidas (00000000000000, ...)
        return False

    def calc_dv(base: str, pesos: list[int]) -> int:
        soma = sum(int(d) * p for d, p in zip(base, pesos))
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto

    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    pesos2 = [6] + pesos1
    dv1 = calc_dv(num[:12], pesos1)
    dv2 = calc_dv(num[:12] + str(dv1), pesos2)
    return num[12] == str(dv1) and num[13] == str(dv2)


def formatar_cnpj(cnpj: str) -> str:
    n = _only_digits(cnpj)
    if len(n) != 14:
        return cnpj
    return f"{n[:2]}.{n[2:5]}.{n[5:8]}/{n[8:12]}-{n[12:]}"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/identificacao", response_model=IdentificacaoResponse)
async def identificacao(payload: IdentificacaoRequest):
    """Valida o CNPJ, registra no banco (estudo) e retorna resposta mock.

    Gancho para, no futuro, plugar a API oficial (Integra Contador / SERPRO).
    """
    cnpj_num = _only_digits(payload.cnpj)
    valido = validar_cnpj(cnpj_num)

    # Registro local apenas para estudo/histórico
    doc = {
        "id": str(uuid.uuid4()),
        "cnpj": cnpj_num,
        "cnpj_formatado": formatar_cnpj(cnpj_num),
        "valido": valido,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.identificacoes.insert_one(doc)

    if not valido:
        return IdentificacaoResponse(
            status="erro",
            valido=False,
            cnpj=cnpj_num,
            mensagem="CNPJ inválido. Verifique os dígitos informados.",
        )

    # MOCK: nenhuma consulta à Receita é feita neste ambiente de estudo.
    return IdentificacaoResponse(
        status="ok",
        valido=True,
        cnpj=formatar_cnpj(cnpj_num),
        mensagem="CNPJ recebido com sucesso (ambiente de estudo — sem consulta à Receita).",
    )


@api_router.get("/consulta-cnpj/{cnpj}", response_model=ConsultaCnpjResponse)
async def consulta_cnpj(cnpj: str):
    """Consulta o nome/razão social do contribuinte pelo CNPJ (BrasilAPI, pública).

    Em caso de CNPJ inexistente ou falha, retorna um nome genérico para o fluxo de estudo.
    """
    cnpj_num = _only_digits(cnpj)
    formatado = formatar_cnpj(cnpj_num)
    nome = None
    situacao = None
    encontrado = False

    if validar_cnpj(cnpj_num):
        try:
            async with httpx.AsyncClient(timeout=15) as http_client:
                resp = await http_client.get(
                    f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_num}"
                )
            if resp.status_code == 200:
                data = resp.json()
                nome = (data.get("razao_social") or data.get("nome_fantasia") or "").strip()
                situacao = data.get("descricao_situacao_cadastral")
                encontrado = bool(nome)
        except Exception as exc:  # falha de rede/timeout — segue com fallback
            logger.warning("Falha ao consultar BrasilAPI: %s", exc)

    if not nome:
        nome = "Contribuinte não localizado"

    # Registro local (estudo)
    await db.consultas.insert_one({
        "id": str(uuid.uuid4()),
        "cnpj": cnpj_num,
        "cnpj_formatado": formatado,
        "nome": nome,
        "encontrado": encontrado,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return ConsultaCnpjResponse(
        cnpj=cnpj_num,
        cnpj_formatado=formatado,
        nome=nome,
        situacao=situacao,
        encontrado=encontrado,
    )


MESES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]


def _vencimento_das(ano: int, mes: int) -> date:
    """Vencimento do DAS: dia 20 do mês seguinte, adiado para o próximo dia útil."""
    ano_venc = ano + 1 if mes == 12 else ano
    mes_venc = 1 if mes == 12 else mes + 1
    d = date(ano_venc, mes_venc, 20)
    # fins de semana e o feriado nacional de 20/11 adiam para o próximo dia útil
    while d.weekday() >= 5 or (d.month == 11 and d.day == 20):
        d += timedelta(days=1)
    return d


@api_router.get("/apuracao/{cnpj}/{ano}", response_model=ApuracaoResponse)
async def apuracao(cnpj: str, ano: int):
    """Períodos de apuração do ano-calendário.

    Sem acesso à base da Receita (Integra Contador), todos os períodos são
    retornados como "Liquidado" — nesse caso a Receita exibe "-" nos valores.
    """
    cnpj_num = _only_digits(cnpj)
    hoje = datetime.now(timezone.utc).date()
    ultimo_dia = date(hoje.year + (hoje.month == 12), (hoje.month % 12) + 1, 1) - timedelta(days=1)

    periodos = [
        PeriodoApuracao(
            pa=f"{ano}{mes:02d}",
            rotulo=f"{MESES_PT[mes - 1]}/{ano}",
            apurado="Sim",
            situacao="Liquidado",
            vencimento=_vencimento_das(ano, mes).strftime("%d/%m/%Y"),
            principal="-",
            multa="-",
            juros="-",
            total="-",
            data_vencimento="-",
            data_acolhimento="-",
        )
        for mes in range(1, 13)
    ]

    return ApuracaoResponse(
        cnpj=cnpj_num,
        cnpj_formatado=formatar_cnpj(cnpj_num),
        ano=ano,
        data_pagamento=hoje.strftime("%d/%m/%Y"),
        data_pagamento_inicio=hoje.strftime("%d/%m/%Y"),
        data_pagamento_fim=ultimo_dia.strftime("%d/%m/%Y"),
        periodos=periodos,
    )


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
