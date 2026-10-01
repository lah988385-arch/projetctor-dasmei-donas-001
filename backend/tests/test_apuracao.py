"""Tests for GET /api/apuracao/{cnpj}/{ano} endpoint."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pgmei-study.preview.emergentagent.com').rstrip('/')

CNPJ_A = "37411286000108"
EXPECTED_2026 = {
    "202601": "20/02/2026",
    "202602": "20/03/2026",
    "202603": "20/04/2026",
    "202604": "20/05/2026",
    "202605": "22/06/2026",
    "202606": "20/07/2026",
    "202607": "20/08/2026",
    "202608": "21/09/2026",
    "202609": "20/10/2026",
    "202610": "23/11/2026",
    "202611": "21/12/2026",
    "202612": "20/01/2027",
}


def test_apuracao_2026_cnpj_a():
    r = requests.get(f"{BASE_URL}/api/apuracao/{CNPJ_A}/2026", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["cnpj"] == CNPJ_A
    assert data["cnpj_formatado"] == "37.411.286/0001-08"
    assert data["ano"] == 2026
    assert len(data["periodos"]) == 12
    rotulos = [p["rotulo"] for p in data["periodos"]]
    assert rotulos[0] == "Janeiro/2026"
    assert rotulos[-1] == "Dezembro/2026"
    for p in data["periodos"]:
        assert p["situacao"] == "Liquidado"
        assert p["apurado"] == "Sim"
        for k in ("principal", "multa", "juros", "total", "data_vencimento", "data_acolhimento"):
            assert p[k] == "-", f"{p['pa']} {k}={p[k]}"
        assert p["vencimento"] == EXPECTED_2026[p["pa"]], f"PA {p['pa']} esperado {EXPECTED_2026[p['pa']]} got {p['vencimento']}"


def test_apuracao_2024_dates_are_business_days():
    r = requests.get(f"{BASE_URL}/api/apuracao/33648223000119/2024", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["ano"] == 2024
    assert len(data["periodos"]) == 12
    import datetime as dt
    for p in data["periodos"]:
        d = dt.datetime.strptime(p["vencimento"], "%d/%m/%Y").date()
        # not weekend
        assert d.weekday() < 5
        # not 20/11 (feriado)
        assert not (d.month == 11 and d.day == 20)
        assert p["situacao"] == "Liquidado"
    # formato de datas no cabeçalho
    for k in ("data_pagamento", "data_pagamento_inicio", "data_pagamento_fim"):
        dt.datetime.strptime(data[k], "%d/%m/%Y")
