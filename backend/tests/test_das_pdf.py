"""Tests for POST /api/das/pdf + GET /api/consulta-cnpj (uf field)."""
import io
import os
import re

import pdfplumber
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

CNPJ_MARIA = "40570199000108"
CNPJ_LUCI = "37411286000108"


def _post_pdf(payload, expected=200):
    r = requests.post(f"{API}/das/pdf", json=payload, timeout=60)
    assert r.status_code == expected, f"{r.status_code}: {r.text[:300]}"
    return r


def _normalize(text):
    """Remove isolated watermark letters that pdfplumber interleaves with the data."""
    text = re.sub(r"\s+", " ", text)
    # Drop single uppercase letters bordered by spaces (watermark artifacts).
    for _ in range(3):
        text = re.sub(r" [A-Z] ", " ", text)
    text = re.sub(r"(\d)\s*,\s*(\d{2})", r"\1,\2", text)
    return re.sub(r"\s+", " ", text).strip()


def _extract_pages(pdf_bytes):
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return [p.extract_text() or "" for p in pdf.pages]


# ---------- Consulta CNPJ now exposes UF ----------
def test_consulta_cnpj_returns_uf():
    r = requests.get(f"{API}/consulta-cnpj/{CNPJ_MARIA}", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "uf" in data
    assert data["uf"] == "RN"
    assert "MARIA JANIERE" in (data.get("nome") or "").upper()
    assert data.get("situacao")


# ---------- Single period PDF (agosto/2026) ----------
def test_das_pdf_ago_2026_contents():
    r = _post_pdf({
        "cnpj": CNPJ_MARIA,
        "ano": 2026,
        "periodos": ["202608"],
        "data_pagamento": "01/10/2026",
    })
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content.startswith(b"%PDF")
    pages = _extract_pages(r.content)
    assert len(pages) == 1
    text = _normalize(pages[0])

    expected_fragments = [
        "Documento de Arrecadação",
        "do Simples Nacional",
        "40.570.199/0001-08",
        "MARIA JANIERE AVELINO 04508120490",
        "agosto/2026",
        "21/09/2026",
        "CPF: 045.081.204-90",
        "0151",
        "INSS - SIMPLES NACIONAL - MEI",
        "0083",
        "ICMS - SIMPLES NACIONAL - MEI",
        "AUTENTICAÇÃO MECÂNICA",
        "DOCUMENTO DE ESTUDO",
        "NÃO PAGÁVEL",
        "Totais",
    ]
    missing = [frag for frag in expected_fragments if frag not in text]
    assert not missing, f"Missing fragments: {missing}\n---text---\n{text}"

    # Tributos line
    assert re.search(r"Tributos\s*\(R\$\):\s*INSS\s*81,05\s*ICMS\s*1,00\s*ISS\s*0,00", text), text

    # Expected numeric lines (principal/multa/juros/total)
    for line in [
        ("81,05", "2,67", "0,81", "84,53"),  # INSS
        ("1,00", "0,03", "0,01", "1,04"),    # ICMS
        ("82,05", "2,70", "0,82", "85,57"),  # Totais
    ]:
        for v in line:
            assert v in text, f"{v} missing. text={text}"


# ---------- Multi period PDF (two pages) ----------
def test_das_pdf_two_pages():
    r = _post_pdf({
        "cnpj": CNPJ_MARIA,
        "ano": 2026,
        "periodos": ["202608", "202609"],
        "data_pagamento": "01/10/2026",
    })
    pages = _extract_pages(r.content)
    assert len(pages) == 2
    p2 = _normalize(pages[1])
    assert "setembro/2026" in p2
    assert "20/10/2026" in p2  # vencimento
    assert re.search(r"Totais\s*82,05\s*0,00\s*0,00\s*82,05", p2), p2


# ---------- Validations ----------
def test_das_pdf_cnpj_invalido():
    _post_pdf({"cnpj": "11111111111111", "ano": 2026, "periodos": ["202608"],
               "data_pagamento": "01/10/2026"}, expected=400)


def test_das_pdf_periodos_vazios():
    _post_pdf({"cnpj": CNPJ_MARIA, "ano": 2026, "periodos": [],
               "data_pagamento": "01/10/2026"}, expected=400)


def test_das_pdf_periodo_fora_do_ano():
    _post_pdf({"cnpj": CNPJ_MARIA, "ano": 2026, "periodos": ["202501"],
               "data_pagamento": "01/10/2026"}, expected=400)


# ---------- Different year uses salário mínimo of that year ----------
def test_das_pdf_ano_2024_inss_70_60():
    r = _post_pdf({
        "cnpj": CNPJ_MARIA,
        "ano": 2024,
        "periodos": ["202401"],
        "data_pagamento": "20/02/2024",  # exact vencimento → no multa/juros
    })
    pages = _extract_pages(r.content)
    assert len(pages) == 1
    text = _normalize(pages[0])
    assert "70,60" in text
    assert "1,00" in text
    assert "71,60" in text
