import streamlit as st
import pandas as pd
import sqlite3
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
from fpdf import FPDF
import os
import math
import time
import base64
import urllib.parse
import re
import io
import requests
import calendar
import json

# Carregar .env se existir (para ASAAS no Streamlit)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
ASAAS_API_KEY = os.getenv("ASAAS_API_KEY") or os.getenv("ASAAS_API_KEY".lower())
ASAAS_ENV = (os.getenv("ASAAS_ENV") or os.getenv("ASAAS_ENV".lower()) or "sandbox").strip().lower()

# IA: usa apenas Gemini (Google Generative AI)
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

# ==============================================================================
# 1. CONFIGURAÇÃO VISUAL
# ==============================================================================
st.set_page_config(page_title="BFX Manager", layout="wide", page_icon="💎", initial_sidebar_state="expanded")

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    .login-box { max-width: 420px; margin: 60px auto; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); text-align: center; border: 1px solid #f1f5f9; }
    div.css-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 15px; }
    .kpi-card { background-color: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: left; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); height: 100%; }
    .kpi-title { font-size: 13px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .kpi-metric { font-size: 28px; color: #0f172a; font-weight: 800; }
    .kpi-sub { font-size: 14px; margin-top: 4px; font-weight: 600; }
    .kpi-up { color: #10b981; } .kpi-down { color: #ef4444; } .kpi-neutral { color: #64748b; }
    .fin-card { background: white; padding: 15px; border-radius: 10px; border: 1px solid #e5e7eb; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .fin-label { font-size: 12px; color: #6b7280; font-weight: 700; text-transform: uppercase; }
    .fin-value { font-size: 24px; color: #111827; font-weight: 800; margin-top: 5px; }
    .fin-good { color: #059669; } .fin-bad { color: #dc2626; }
    .stButton button { width: 100%; border-radius: 10px; height: 3.2em; font-weight: 600; border: none; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; transition: all 0.2s; }
    .stButton button:hover { box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); opacity: 0.95; }
    .whatsapp-btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; background: linear-gradient(90deg, #25D366 0%, #128C7E 100%); color: white !important; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 10px; box-shadow: 0 4px 10px rgba(37, 211, 102, 0.2); border: 1px solid #1DA851; }
    .whatsapp-btn:hover { transform: translateY(-2px); }
    .chat-msg { padding: 10px; border-radius: 10px; margin-bottom: 10px; }
    .chat-user { background-color: #e0f2fe; text-align: right; }
    .chat-bot { background-color: #f1f5f9; }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# 2. BANCO DE DADOS
# ==============================================================================
@st.cache_resource
def get_connection(): return sqlite3.connect('bfx_sistema.db', check_same_thread=False)
conn = get_connection()

def init_db():
    c = conn.cursor()
    tables = [
        '''CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, renda REAL, empresa TEXT, matricula TEXT, telefone TEXT, cpf TEXT, cnpj TEXT, tipo TEXT, data_nascimento DATE, cep TEXT, endereco TEXT)''',
        '''CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, custo_padrao REAL, marca TEXT, categoria TEXT, ncm TEXT, imagem TEXT, fornecedor_id INTEGER, qtd_estoque INTEGER DEFAULT 0, valor_venda REAL DEFAULT 0)''',
        '''CREATE TABLE IF NOT EXISTS vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, data_venda DATE, vendedor TEXT, cliente_id INTEGER, produto_nome TEXT, custo_produto REAL, valor_venda REAL, valor_frete REAL DEFAULT 0, custo_envio REAL DEFAULT 0, parcelas INTEGER, valor_parcela REAL, taxa_financeira_valor REAL, lucro_liquido REAL, antecipada INTEGER DEFAULT 1, excedeu_limite INTEGER DEFAULT 0, comprovante_pdf TEXT, FOREIGN KEY(cliente_id) REFERENCES clientes(id))''',
        '''CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY AUTOINCREMENT, modelo_contrato TEXT, logo_path TEXT, openai_key TEXT)''',
        '''CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT, nome_exibicao TEXT, email TEXT, telefone TEXT, data_nascimento DATE, endereco TEXT, cep TEXT, meta_mensal REAL DEFAULT 50000.0, comissao_pct REAL DEFAULT 2.0)''',
        '''CREATE TABLE IF NOT EXISTS fornecedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, telefone TEXT)''',
        '''CREATE TABLE IF NOT EXISTS empresas_parceiras (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, responsavel_rh TEXT, telefone_rh TEXT, email_rh TEXT)''',
        '''CREATE TABLE IF NOT EXISTS pagamentos (id INTEGER PRIMARY KEY AUTOINCREMENT, data_pagamento DATE, vendedor TEXT, valor REAL, obs TEXT)''',
        '''CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, data_hora DATETIME, usuario TEXT, acao TEXT, detalhes TEXT)''',
        '''CREATE TABLE IF NOT EXISTS despesas (id INTEGER PRIMARY KEY AUTOINCREMENT, data_despesa DATE, descricao TEXT, categoria TEXT, valor REAL, tipo TEXT)''',
        '''CREATE TABLE IF NOT EXISTS avisos (id INTEGER PRIMARY KEY AUTOINCREMENT, data_criacao DATETIME, mensagem TEXT, ativo INTEGER DEFAULT 1)'''
    ]
    for sql in tables: c.execute(sql)

    def force_add_column(table, col, dtype):
        try:
            existing_cols = [i[1] for i in c.execute(f"PRAGMA table_info({table})")]
            if col not in existing_cols: c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}")
        except: pass

    force_add_column('clientes', 'cnpj', 'TEXT')
    force_add_column('clientes', 'tipo', 'TEXT')
    force_add_column('produtos', 'valor_venda', 'REAL DEFAULT 0')
    force_add_column('vendas', 'comprovante_pdf', 'TEXT')
    force_add_column('vendas', 'forma_pagamento', 'TEXT')
    force_add_column('vendas', 'asaas_boleto_json', 'TEXT')
    force_add_column('config', 'openai_key', 'TEXT')
    force_add_column('config', 'gemini_key', 'TEXT')

    try:
        c.execute("UPDATE usuarios SET password = '123' WHERE username = 'bruno'")
        if c.execute("SELECT count(*) FROM usuarios WHERE username='bruno'").fetchone()[0] == 0:
             c.execute("INSERT INTO usuarios (username, password, role, nome_exibicao) VALUES ('bruno', '123', 'vendedor', 'Bruno')")
    except: pass

    if c.execute("SELECT count(*) FROM usuarios WHERE username='admin'").fetchone()[0] == 0:
        c.execute("INSERT INTO usuarios (username, password, role, nome_exibicao) VALUES ('admin', 'admin', 'admin', 'Administrador')")
    
    for emp in ["Amazon Five", "Gimam"]:
        if c.execute("SELECT count(*) FROM empresas_parceiras WHERE nome=?", (emp,)).fetchone()[0] == 0:
            c.execute("INSERT INTO empresas_parceiras (nome, responsavel_rh, telefone_rh, email_rh) VALUES (?,?,?,?)", (emp, "RH "+emp, "", ""))
    if c.execute("SELECT COUNT(*) FROM config").fetchone()[0] == 0:
        c.execute("INSERT INTO config (modelo_contrato, logo_path) VALUES (?, ?)", ("Texto Padrão...", ""))
    conn.commit()
init_db()

# ==============================================================================
# 3. MÁSCARAS & UTILITÁRIOS
# ==============================================================================
def mask_cpf(val):
    v = re.sub(r'\D', '', str(val)); return f"{v[:3]}.{v[3:6]}.{v[6:9]}-{v[9:]}" if len(v) == 11 else val
def mask_cnpj(val):
    v = re.sub(r'\D', '', str(val)); return f"{v[:2]}.{v[2:5]}.{v[5:8]}/{v[8:12]}-{v[12:]}" if len(v) == 14 else val
def mask_tel(val):
    v = re.sub(r'\D', '', str(val))
    if len(v) == 11: return f"({v[:2]}) {v[2:7]}-{v[7:]}"
    if len(v) == 10: return f"({v[:2]}) {v[2:6]}-{v[6:]}"
    return val
def mask_cep(val):
    v = re.sub(r'\D', '', str(val)); return f"{v[:5]}-{v[5:]}" if len(v) == 8 else val
def clean_str(val): return re.sub(r'\D', '', str(val)) if val else ""
def format_brl(v): return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if v else "R$ 0,00"
def gerar_link_zap(tel, msg): return f"https://wa.me/{clean_str(tel)}?text={urllib.parse.quote(msg)}" if tel else None

def criar_boletos_asaas(cliente_dados, valor_total, parcelas, valor_parcela, data_primeiro_vencimento, descricao="Venda BFX"):
    """Cria cliente no Asaas, cobrança parcelada em boleto e retorna lista [{parcela, dueDate, bankSlipUrl, id}, ...]. Em erro retorna (None, mensagem_erro)."""
    if not ASAAS_API_KEY:
        return None, "ASAAS_API_KEY não configurada."
    base = "https://api.asaas.com/v3" if ASAAS_ENV == "production" else "https://sandbox.asaas.com/api/v3"
    headers = {"access_token": ASAAS_API_KEY, "Content-Type": "application/json"}
    cpf_cnpj = clean_str(cliente_dados.get("cpf") or cliente_dados.get("cnpj") or "")
    if not cpf_cnpj:
        return None, "Cliente sem CPF/CNPJ cadastrado."
    nome = (cliente_dados.get("nome") or cliente_dados.get("c") or "").strip() or "Cliente"
    tel = clean_str(cliente_dados.get("telefone") or "")
    payload_customer = {"name": nome[:100], "cpfCnpj": cpf_cnpj, "phone": tel[:20] if tel else None}
    payload_customer = {k: v for k, v in payload_customer.items() if v is not None}
    try:
        r_c = requests.post(f"{base}/customers", headers=headers, json=payload_customer, timeout=15)
        r_c.raise_for_status()
        customer_id = r_c.json().get("id")
        if not customer_id:
            return None, "Resposta Asaas sem ID do cliente."
    except requests.RequestException as e:
        err = getattr(e, "response", None)
        msg = err.text if err else str(e)
        try:
            j = err.json() if err else {}
            msg = j.get("errors", [{}])[0].get("description", msg) if isinstance(j.get("errors"), list) else msg
        except Exception:
            pass
        return None, f"Asaas (cliente): {msg}"
    due = data_primeiro_vencimento.strftime("%Y-%m-%d") if hasattr(data_primeiro_vencimento, "strftime") else str(data_primeiro_vencimento)[:10]
    payload_pay = {"customer": customer_id, "billingType": "BOLETO", "installmentCount": parcelas, "installmentValue": round(float(valor_parcela), 2), "dueDate": due, "description": descricao[:500]}
    try:
        r_p = requests.post(f"{base}/payments", headers=headers, json=payload_pay, timeout=15)
        r_p.raise_for_status()
        data = r_p.json()
        installment_id = data.get("installment")
        if not installment_id:
            return None, "Resposta Asaas sem ID do parcelamento."
    except requests.RequestException as e:
        err = getattr(e, "response", None)
        msg = err.text if err else str(e)
        try:
            j = err.json() if err else {}
            msg = j.get("errors", [{}])[0].get("description", msg) if isinstance(j.get("errors"), list) else msg
        except Exception:
            pass
        return None, f"Asaas (cobrança): {msg}"
    try:
        r_list = requests.get(f"{base}/installments/{installment_id}/payments", headers=headers, timeout=15)
        r_list.raise_for_status()
        lista = r_list.json().get("data", [])
    except requests.RequestException as e:
        return None, f"Asaas (listar parcelas): {getattr(e, 'response', e)}"
    out = []
    for p in lista:
        out.append({"parcela": p.get("installmentNumber", len(out) + 1), "dueDate": p.get("dueDate", ""), "bankSlipUrl": p.get("bankSlipUrl") or "", "id": p.get("id", "")})
    return out, None

def sugerir_ncm(nome_prod):
    if not nome_prod: return ""
    nome = nome_prod.lower()
    ncms = {"celular":"8517.12.31","iphone":"8517.12.31","smartphone":"8517.12.31","carregador":"8504.40.10","cabo":"8544.42.00","fone":"8518.30.00","airpods":"8518.30.00","tv":"8528.72.00","televisor":"8528.72.00","notebook":"8471.30.12","macbook":"8471.30.12","tablet":"8471.30.11","ipad":"8471.30.11","capa":"3926.90.90","pelicula":"3919.90.00","smartwatch":"8517.62.77","apple watch":"8517.62.77","alexa":"8518.22.00"}
    for k, v in ncms.items():
        if k in nome: return v
    return ""

def check_credito(cli_id, parc_nova):
    res = pd.read_sql(f"SELECT renda FROM clientes WHERE id={cli_id}", conn)
    if res.empty: return True, 0, 0, 0
    teto = min(res.iloc[0]['renda']*0.30, 475.00)
    vendas = pd.read_sql(f"SELECT data_venda, parcelas, valor_parcela FROM vendas WHERE cliente_id={cli_id}", conn)
    tomado = 0.0; hj = datetime.now().date()
    for _, r in vendas.iterrows():
        try:
            dv = pd.to_datetime(r['data_venda']).date()
            ini = dv.replace(day=1) + relativedelta(months=1 if dv.day <= 20 else 2)
            fim = ini + relativedelta(months=int(r['parcelas']))
            if ini <= hj.replace(day=1) < fim: tomado += r['valor_parcela']
        except: continue
    return (tomado+parc_nova) <= (teto+1.0), teto-tomado, tomado, teto

def calcular_dre_avancado(mes_ano):
    q_rec = f"SELECT SUM(valor_venda + valor_frete) as total FROM vendas WHERE strftime('%Y-%m', data_venda)='{mes_ano}'"
    receita_bruta = pd.read_sql(q_rec, conn).iloc[0]['total'] or 0.0
    q_cmv = f"SELECT SUM(custo_produto) as total FROM vendas WHERE strftime('%Y-%m', data_venda)='{mes_ano}'"
    cmv = pd.read_sql(q_cmv, conn).iloc[0]['total'] or 0.0
    q_frete_custo = f"SELECT SUM(custo_envio) as total FROM vendas WHERE strftime('%Y-%m', data_venda)='{mes_ano}'"
    custo_frete_real = pd.read_sql(q_frete_custo, conn).iloc[0]['total'] or 0.0
    q_vends = f"SELECT vendedor, SUM(valor_venda+valor_frete) as total FROM vendas WHERE strftime('%Y-%m', data_venda)='{mes_ano}' GROUP BY vendedor"
    df_vends = pd.read_sql(q_vends, conn); comissoes = 0.0
    for _, r in df_vends.iterrows():
        pct = conn.execute("SELECT comissao_pct FROM usuarios WHERE nome_exibicao=?", (r['vendedor'],)).fetchone()
        comissoes += r['total'] * ((pct[0] if pct else 2.0) / 100.0)
    q_desp = f"SELECT tipo, SUM(valor) as total FROM despesas WHERE strftime('%Y-%m', data_despesa)='{mes_ano}' GROUP BY tipo"
    df_desp = pd.read_sql(q_desp, conn)
    custo_fixo = df_desp[df_desp['tipo']=='Fixa']['total'].sum() if not df_desp.empty else 0.0
    desp_var = df_desp[df_desp['tipo']=='Variável']['total'].sum() if not df_desp.empty else 0.0
    custos_var_totais = cmv + comissoes + desp_var + custo_frete_real
    margem_contrib = receita_bruta - custos_var_totais
    lucro_liquido = margem_contrib - custo_fixo
    margem_pct = (margem_contrib / receita_bruta) if receita_bruta > 0 else 0
    ponto_equilibrio = (custo_fixo / margem_pct) if margem_pct > 0 else 0
    meta_global = conn.execute("SELECT SUM(meta_mensal) FROM usuarios").fetchone()[0] or 100000.0
    return {
        "Receita": receita_bruta,
        "(-) Custos Var.": custos_var_totais,
        "(=) Margem Contrib.": margem_contrib,
        "(-) Custos Fixos": custo_fixo,
        "(=) Lucro Líquido": lucro_liquido,
        "Ponto Equilíbrio": ponto_equilibrio,
        "Meta Global": meta_global,
        "Detalhe": {
            "CMV": cmv,
            "Comissões": comissoes,
            "Desp. Var": desp_var,
            "Frete Real": custo_frete_real
        }
    }

def calcular_relatorio_parceiro(empresa, mes_ref):
    mes_str = mes_ref 
    q = f"""SELECT c.nome, c.cpf, c.matricula, v.data_venda, v.parcelas, v.valor_parcela, v.antecipada FROM vendas v JOIN clientes c ON v.cliente_id = c.id WHERE c.empresa = '{empresa}'"""
    df = pd.read_sql(q, conn)
    lista_descontos = []; total_geral = 0.0
    for _, r in df.iterrows():
        try:
            dv = datetime.strptime(r['data_venda'], '%Y-%m-%d').date()
            if r['antecipada'] == 1:
                if dv.strftime("%Y-%m") == mes_str:
                    val = r['valor_parcela'] * r['parcelas']
                    lista_descontos.append({'Nome': r['nome'], 'CPF': r['cpf'], 'Matrícula': r['matricula'], 'Valor': val}); total_geral += val
            else:
                ini = dv + relativedelta(months=1 if dv.day <= 20 else 2)
                for p in range(int(r['parcelas'])):
                    venc = ini + relativedelta(months=p)
                    if venc.strftime("%Y-%m") == mes_str:
                        lista_descontos.append({'Nome': r['nome'], 'CPF': r['cpf'], 'Matrícula': r['matricula'], 'Valor': r['valor_parcela']}); total_geral += r['valor_parcela']
        except: continue
    return pd.DataFrame(lista_descontos).groupby(['Nome','CPF','Matrícula'], as_index=False).sum(), total_geral

def calcular_fluxo_caixa():
    hj = datetime.now().date(); fluxo = []
    for i in range(6):
        mes_ref = hj + relativedelta(months=i); mes_str = mes_ref.strftime("%Y-%m"); mes_nome = mes_ref.strftime("%b/%Y")
        q_vendas = "SELECT data_venda, parcelas, valor_parcela, antecipada FROM vendas"
        df_v = pd.read_sql(q_vendas, conn); entradas = 0.0
        for _, r in df_v.iterrows():
            if r['antecipada'] == 1:
                if r['data_venda'].startswith(mes_str): entradas += (r['valor_parcela'] * r['parcelas'])
            else:
                dv = datetime.strptime(r['data_venda'], '%Y-%m-%d').date()
                venc_base = dv + relativedelta(months=1 if dv.day <= 20 else 2)
                for p in range(int(r['parcelas'])):
                    venc = venc_base + relativedelta(months=p)
                    if venc.strftime("%Y-%m") == mes_str: entradas += r['valor_parcela']
        q_desp = f"SELECT SUM(valor) FROM despesas WHERE strftime('%Y-%m', data_despesa)='{mes_str}'"
        saidas = conn.execute(q_desp).fetchone()[0] or 0.0
        fluxo.append({"Mês": mes_nome, "Entradas": entradas, "Saídas": saidas, "Saldo": entradas - saidas})
    return pd.DataFrame(fluxo)

def baixar_backup():
    with open('bfx_sistema.db', 'rb') as f: return f.read()
def image_to_base64(f): return base64.b64encode(f.getvalue()).decode('utf-8') if f else None
def base64_to_image(b): return base64.b64decode(b) if b else None
def get_calendario(ano, mes):
    q = "SELECT v.data_venda, v.parcelas, v.valor_parcela FROM vendas v WHERE v.antecipada = 0"
    vendas = pd.read_sql(q, conn); dados = {}
    for _, r in vendas.iterrows():
        try:
            dv = datetime.strptime(r['data_venda'], '%Y-%m-%d').date()
            ini = dv.replace(day=1) + relativedelta(months=1 if dv.day <= 20 else 2)
            for p in range(int(r['parcelas'])):
                venc = ini + relativedelta(months=p)
                if venc.year == ano and venc.month == mes: dados[venc.day] = dados.get(venc.day, 0) + r['valor_parcela']
        except: continue
    return dados

# PDF
class PDF(FPDF):
    def header(self):
        try:
            p = conn.execute("SELECT logo_path FROM config").fetchone()[0]
            if p and os.path.exists(p): self.image(p, 10, 8, 40)
        except: pass
        self.set_font('Arial', 'B', 16); self.cell(0, 10, 'RECIBO E CONTRATO', 0, 1, 'C'); self.ln(15)
def gerar_pdf(dados, tipo="recibo", texto_custom=None):
    pdf = PDF(); pdf.add_page()
    if tipo == "recibo":
        doc_id = dados.get('cpf') if dados.get('cpf') else dados.get('cnpj', '')
        pdf.set_font("Arial", 'B', 11); pdf.cell(0, 8, "  1. IDENTIFICAÇÃO", 1, 1, 'L')
        pdf.set_font("Arial", '', 10); pdf.multi_cell(0, 6, f"Nome/Razão Social: {dados['c']}\nCPF/CNPJ: {doc_id}\nEmpresa/Vínculo: {dados['e']}"); pdf.ln(5)
        pdf.set_font("Arial", 'B', 11); pdf.cell(0, 8, "  2. DETALHES", 1, 1, 'L')
        pdf.set_font("Arial", '', 10); pdf.multi_cell(0, 6, f"Produto: {dados['p']}\nTotal: {format_brl(dados['v']+dados.get('frete',0))}\nParcelas: {dados['pa']}x de {format_brl(dados['vp'])}"); pdf.ln(5)
        pdf.set_font("Arial", 'B', 11); pdf.cell(0, 8, "  3. AUTORIZAÇÃO", 1, 1, 'L'); pdf.ln(2)
        c = conn.cursor(); txt = texto_custom if texto_custom else c.execute("SELECT modelo_contrato FROM config").fetchone()[0]
        final = txt.replace("{CLIENTE}", str(dados['c'])).replace("{VALOR}", f"{dados['v']:,.2f}").replace("{PRODUTO}", str(dados['p'])).replace("{PARCELAS}", str(dados['pa'])).replace("{EMPRESA_PARCEIRA}", str(dados['e'])).replace("{MATRICULA}", str(dados.get('m',''))).replace("{CPF}", str(doc_id))
        pdf.set_font("Arial", '', 10); pdf.multi_cell(0, 5, final); pdf.ln(15)
        pdf.line(20, pdf.get_y(), 190, pdf.get_y()); pdf.cell(0, 5, "Assinatura Cliente", 0, 1, 'C')
    elif tipo == "recibo_padrao":
        doc_id = dados.get('cpf') if dados.get('cpf') else dados.get('cnpj', '')
        pdf.set_font("Arial", 'B', 11); pdf.cell(0, 8, "  1. IDENTIFICAÇÃO", 1, 1, 'L')
        pdf.set_font("Arial", '', 10); pdf.multi_cell(0, 6, f"Nome/Razão Social: {dados['c']}\nCPF/CNPJ: {doc_id}\nEmpresa/Vínculo: {dados['e']}"); pdf.ln(5)
        pdf.set_font("Arial", 'B', 11); pdf.cell(0, 8, "  2. DETALHES", 1, 1, 'L')
        pdf.set_font("Arial", '', 10); pdf.multi_cell(0, 6, f"Produto: {dados['p']}\nTotal: {format_brl(dados['v']+dados.get('frete',0))}\nParcelas: {dados['pa']}x de {format_brl(dados['vp'])}"); pdf.ln(5)
        pdf.ln(5); pdf.set_font("Arial", '', 9); pdf.cell(0, 5, "Documento de comprovante de compra.", 0, 1, 'C')
    elif tipo == "rh":
        pdf.set_font("Arial",'B',14); pdf.cell(0,10,f"Relatório de Descontos - {dados['empresa']}",0,1,'C')
        pdf.set_font("Arial",'',12); pdf.cell(0,10,f"Referência: {dados['mes']}",0,1,'C'); pdf.ln(5)
        pdf.set_font("Arial",'B',10)
        pdf.cell(70,8,"Nome",1); pdf.cell(35,8,"CPF",1); pdf.cell(30,8,"Matrícula",1); pdf.cell(40,8,"Valor Desconto",1); pdf.ln()
        pdf.set_font("Arial",'',10)
        for _, r in dados['df'].iterrows():
            pdf.cell(70,8,str(r['Nome'])[:35],1); pdf.cell(35,8,str(r['CPF']),1); pdf.cell(30,8,str(r['Matrícula']),1); pdf.cell(40,8,f"R$ {r['Valor']:.2f}",1); pdf.ln()
        pdf.ln(5)
        pdf.set_font("Arial",'B',12); pdf.cell(0,10,f"TOTAL GERAL: {format_brl(dados['total'])}",0,1,'R')
    elif tipo == "geral":
        pdf.set_font("Arial",'B',14); pdf.cell(0,10,f"Relatório Geral de Vendas",0,1,'C')
        pdf.set_font("Arial",'',12); pdf.cell(0,10,f"{dados['periodo']}",0,1,'C'); pdf.ln(5)
        pdf.set_font("Arial",'B',8)
        pdf.cell(25,8,"Data",1); pdf.cell(50,8,"Cliente",1); pdf.cell(40,8,"Produto",1); pdf.cell(30,8,"Valor",1); pdf.cell(20,8,"Tipo",1); pdf.ln()
        pdf.set_font("Arial",'',8)
        for _, r in dados['df'].iterrows():
            pdf.cell(25,8,str(r['data_venda']),1); pdf.cell(50,8,str(r['nome'])[:25],1); pdf.cell(40,8,str(r['produto_nome'])[:20],1)
            pdf.cell(30,8,f"R$ {r['valor_venda']:.2f}",1); pdf.cell(20,8,"Antecipada" if r['antecipada'] else "Mensal",1); pdf.ln()
        pdf.ln(5); pdf.set_font("Arial",'B',12); pdf.cell(0,10,f"TOTAL: {format_brl(dados['total'])}",0,1,'R')
    elif tipo == "catalogo":
        pdf.set_font("Arial", 'B', 16); pdf.cell(0, 10, "CATÁLOGO DE PRODUTOS", 0, 1, 'C'); pdf.ln(10)
        df_prod = dados['df']
        for i, r in df_prod.iterrows():
            pdf.set_fill_color(248, 250, 252)
            pdf.rect(10, pdf.get_y(), 190, 50, 'F')
            if r['imagem']:
                try:
                    img_data = base64.b64decode(r['imagem'])
                    temp_img = f"temp_img_{i}.jpg"
                    with open(temp_img, "wb") as f: f.write(img_data)
                    pdf.image(temp_img, 15, pdf.get_y()+5, 40, 40)
                    os.remove(temp_img)
                except: pass
            pdf.set_xy(60, pdf.get_y()+5)
            pdf.set_font("Arial", 'B', 12); pdf.cell(0, 8, str(r['nome']), 0, 1)
            pdf.set_x(60)
            pdf.set_font("Arial", '', 10); pdf.cell(0, 6, f"Marca: {r['marca']}", 0, 1)
            pdf.set_x(60)
            pdf.set_font("Arial", 'B', 14); pdf.set_text_color(0, 100, 0)
            pdf.cell(0, 10, f"{format_brl(r['valor_venda'])}", 0, 1)
            pdf.set_text_color(0, 0, 0) 
            pdf.ln(25); pdf.ln(5)
    return pdf.output(dest='S').encode('latin-1')

# ==============================================================================
# 4. LOGIN E SESSÃO
# ==============================================================================
if 'logged_in' not in st.session_state: 
    st.session_state.update({'logged_in':False, 'username':None, 'role':None, 'nome_exibicao':None, 'user_id':None})

def registrar_log(acao, detalhes):
    try: conn.execute("INSERT INTO audit_logs (data_hora, usuario, acao, detalhes) VALUES (?,?,?,?)", (datetime.now(), st.session_state.get('nome_exibicao','Sistema'), acao, detalhes)); conn.commit()
    except: pass

def login_screen():
    c1, c2, c3 = st.columns([1,2,1])
    with c2:
        st.markdown("<br><div class='login-box'><h1>💎 BFX Manager</h1><p style='color:#64748b;'>Acesso Seguro</p>", unsafe_allow_html=True)
        with st.form("login"):
            user = st.text_input("Usuário").lower().strip()
            if 'show_pwd' not in st.session_state: st.session_state.show_pwd = False
            pwd_type = "default" if st.session_state.show_pwd else "password"
            pwd = st.text_input("Senha", type=pwd_type)
            if st.checkbox("Mostrar Senha"): st.session_state.show_pwd = True
            else: st.session_state.show_pwd = False
            if st.form_submit_button("ENTRAR"):
                res = conn.execute("SELECT id, password, role, nome_exibicao FROM usuarios WHERE username=?", (user,)).fetchone()
                if res and res[1] == pwd.strip(): 
                    st.session_state.update({'logged_in':True, 'username':user, 'user_id':res[0], 'role':res[2], 'nome_exibicao':res[3]})
                    registrar_log("LOGIN", "Entrou")
                    st.success(f"Bem-vindo, {res[3]}!"); time.sleep(0.5); st.rerun()
                else: st.error("Incorreto.")
        st.markdown("</div>", unsafe_allow_html=True)

if not st.session_state['logged_in']: login_screen(); st.stop()

# ==============================================================================
# 5. SIDEBAR
# ==============================================================================
with st.sidebar:
    st.title("BFX 💎")
    aviso = pd.read_sql("SELECT mensagem FROM avisos WHERE ativo=1 ORDER BY id DESC LIMIT 1", conn)
    if not aviso.empty: st.markdown(f"<div class='mural-aviso'>📢 <b>Aviso:</b><br>{aviso.iloc[0]['mensagem']}</div>", unsafe_allow_html=True)
    role = st.session_state['role']; nome_user = st.session_state['nome_exibicao']
    st.write(f"Olá, **{nome_user}**")
    if st.button("Sair"): st.session_state['logged_in'] = False; st.rerun()
    st.markdown("---")
    if role == 'admin': menu = st.radio("Menu", ["Dashboard", "💰 Financeiro & DRE", "🏦 Prudent (Antecipação)", "🤖 BFX Intelligence (IA)", "📥 Importação", "Venda Rápida", "Histórico (Editar)", "Cadastros", "👥 Gestão de RH (Equipe)", "🖨️ Relatórios", "Configurações"])
    else: menu = st.radio("Menu", ["Venda Rápida", "Minhas Comissões", "Histórico (Editar)", "Cadastros", "Relatórios PDF", "Meu Perfil"])
    st.markdown("---")
    hj = datetime.now().date(); ini_mes = hj.replace(day=1)
    df_pod = pd.read_sql(f"SELECT vendedor, SUM(valor_venda+valor_frete) as total FROM vendas WHERE data_venda >= '{ini_mes}' GROUP BY vendedor ORDER BY total DESC", conn)
    if not df_pod.empty:
        html_p = "<div class='podio-box'><h5>🏆 Ranking Mês</h5>"
        for i, row in df_pod.head(5).iterrows():
            w = "bold" if row['vendedor']==nome_user else "normal"
            html_p += f"<div class='podio-rank'><span style='font-weight:{w}'>{i+1}º {row['vendedor']}</span><span>{format_brl(row['total'])}</span></div>"
        st.markdown(html_p + "</div>", unsafe_allow_html=True)

# ==============================================================================
# 6. FUNÇÕES IA
# ==============================================================================
def get_ai_context():
    mes_atual = datetime.now().strftime("%Y-%m")
    dre = calcular_dre_avancado(mes_atual)
    return f"Resumo Financeiro: Receita {format_brl(dre['Receita'])}, Lucro {format_brl(dre['(=) Lucro Líquido'])}."

def run_ai_chat(prompt):
    if not HAS_GEMINI: return "Biblioteca não instalada. Digite `pip install google-generativeai` no terminal."
    api_key = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY") or (conn.execute("SELECT gemini_key FROM config").fetchone() or (None,))[0]
    if not api_key: return "Configure GOOGLE_GENERATIVE_AI_API_KEY no .env ou adicione a chave Gemini no menu Configurações."
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        ctx = get_ai_context()
        resp = model.generate_content(f"Contexto: {ctx}\n\nPergunta do usuário: {prompt}")
        return resp.text if resp.text else "Resposta vazia."
    except Exception as e: return f"Erro na IA (Gemini): {e}"

# ==============================================================================
# 7. CONTEÚDO PRINCIPAL
# ==============================================================================

if menu == "Dashboard" and role == 'admin':
    st.subheader("📊 Dashboard Executivo & Performance")
    
    # 1. FILTROS GERAIS
    with st.expander("🔍 Filtros do Dashboard", expanded=True):
        c1, c2, c3 = st.columns(3)
        d_ini = c1.date_input("De", datetime.now().replace(day=1))
        d_fim = c2.date_input("Até", datetime.now())
        vendedores = pd.read_sql("SELECT nome_exibicao FROM usuarios", conn)['nome_exibicao'].tolist()
        sel_vend = c3.multiselect("Vendedores", vendedores, default=vendedores)
    
    if not sel_vend: sel_vend = vendedores
    vends_str = "', '".join(sel_vend)
    
    # Query Principal (Filtrada)
    q_dash = f"""
    SELECT v.data_venda, v.vendedor, v.valor_venda, v.lucro_liquido, v.produto_nome, v.id
    FROM vendas v 
    WHERE v.data_venda BETWEEN '{d_ini}' AND '{d_fim}'
    AND v.vendedor IN ('{vends_str}')
    """
    
    # Query Evolução (Últimos 6 Meses - Independente do filtro)
    date_6m = (datetime.now() - relativedelta(months=5)).replace(day=1).strftime("%Y-%m-%d")
    q_evo = f"""
    SELECT strftime('%Y-%m', data_venda) as mes, SUM(valor_venda) as total, SUM(lucro_liquido) as lucro
    FROM vendas 
    WHERE data_venda >= '{date_6m}'
    GROUP BY mes ORDER BY mes
    """
    
    try: 
        df_dash = pd.read_sql(q_dash, conn)
        df_evo = pd.read_sql(q_evo, conn)
    except: 
        df_dash = pd.DataFrame()
        df_evo = pd.DataFrame()
    
    # 3. EXIBIÇÃO
    if not df_dash.empty:
        # Cálculos KPIs
        fat = df_dash['valor_venda'].sum()
        luc = df_dash['lucro_liquido'].sum() if 'lucro_liquido' in df_dash.columns else 0
        peds = len(df_dash)
        tik = fat / peds if peds > 0 else 0
        margem = (luc / fat * 100) if fat > 0 else 0
        
        # Hall da Fama (Melhor Vendedor)
        best_rev = df_dash.groupby('vendedor')['valor_venda'].sum().idxmax()
        best_rev_val = df_dash.groupby('vendedor')['valor_venda'].sum().max()
        
        # Correção Hall da Fama
        if 'lucro_liquido' in df_dash.columns and df_dash['lucro_liquido'].sum() != 0:
             best_prof = df_dash.groupby('vendedor')['lucro_liquido'].sum().idxmax()
             best_prof_val = df_dash.groupby('vendedor')['lucro_liquido'].sum().max()
        else:
             best_prof = best_rev
             best_prof_val = 0

        # KPIs Cards
        k1, k2, k3, k4 = st.columns(4)
        k1.markdown(f"<div class='kpi-card'><div class='kpi-title'>Faturamento Total</div><div class='kpi-metric'>{format_brl(fat)}</div><div class='kpi-sub kpi-neutral'>{peds} vendas</div></div>", unsafe_allow_html=True)
        k2.markdown(f"<div class='kpi-card'><div class='kpi-title'>Lucro Líquido Real</div><div class='kpi-metric kpi-up'>{format_brl(luc)}</div><div class='kpi-sub kpi-up'>Margem: {margem:.1f}%</div></div>", unsafe_allow_html=True)
        k3.markdown(f"<div class='kpi-card'><div class='kpi-title'>Ticket Médio</div><div class='kpi-metric'>{format_brl(tik)}</div></div>", unsafe_allow_html=True)
        
        # Card Dinâmico (Campeão)
        k4.markdown(f"<div class='kpi-card'><div class='kpi-title'>🏆 Melhor Performance</div><div style='font-size:18px; font-weight:bold'>{best_rev}</div><div class='kpi-sub'>{format_brl(best_rev_val)}</div></div>", unsafe_allow_html=True)
        
        st.markdown("---")
        
        # GRÁFICOS DE LINHA DO TEMPO
        c_evo, c_rank = st.columns([2, 1])
        with c_evo:
            st.markdown("##### 📈 Evolução Mensal (Tendência últimos 6 meses)")
            if not df_evo.empty:
                st.area_chart(df_evo.set_index('mes')[['total', 'lucro']], color=["#3b82f6", "#10b981"])
            else: st.info("Sem dados suficientes para histórico.")
            
        with c_rank:
            st.markdown("##### 📦 Top 5 Produtos (Vol.)")
            top_prod = df_dash['produto_nome'].value_counts().head(5)
            st.bar_chart(top_prod, horizontal=True)

        st.markdown("---")
        st.markdown("##### 📊 Raio-X da Equipe (Performance Detalhada)")
        
        # Tabela Rica
        team_kpi = df_dash.groupby('vendedor').agg(
            Vendas=('id', 'count'),
            Faturamento=('valor_venda', 'sum'),
            Lucro=('lucro_liquido', 'sum'),
            Ticket=('valor_venda', 'mean')
        ).reset_index()
        
        team_kpi['Margem %'] = (team_kpi['Lucro'] / team_kpi['Faturamento'] * 100).fillna(0)
        team_kpi = team_kpi.sort_values('Faturamento', ascending=False)
        
        # TABELA REFINADA (COM TRATAMENTO DE ERRO DE GRADIENTE)
        try:
            st.dataframe(
                team_kpi.style.format({
                    "Faturamento": "R$ {:,.2f}",
                    "Lucro": "R$ {:,.2f}",
                    "Ticket": "R$ {:,.2f}",
                    "Margem %": "{:.1f}%"
                }).background_gradient(subset=['Lucro'], cmap='Greens'),
                use_container_width=True,
                hide_index=True
            )
        except:
            # Fallback para tabela simples se Matplotlib não estiver instalado
            st.dataframe(
                team_kpi.style.format({
                    "Faturamento": "R$ {:,.2f}",
                    "Lucro": "R$ {:,.2f}",
                    "Ticket": "R$ {:,.2f}",
                    "Margem %": "{:.1f}%"
                }),
                use_container_width=True,
                hide_index=True
            )

    else:
        st.warning("⚠️ Nenhuma venda encontrada neste período.")
        st.subheader("🔍 Diagnóstico do Sistema")
        try:
            total_db = conn.execute("SELECT COUNT(*) FROM vendas").fetchone()[0]
            if total_db == 0:
                st.error("🚨 O BANCO DE DADOS ESTÁ VAZIO! Você provavelmente atualizou o código na nuvem e o arquivo .db resetou. Cadastre uma venda nova ou suba seu backup.")
            else:
                st.info(f"💡 Existem **{total_db}** vendas salvas no banco de dados, mas elas estão fora da data selecionada ({d_ini} a {d_fim}). Tente mudar o filtro de data.")
        except: st.error("Erro ao ler banco de dados.")

elif menu == "🤖 BFX Intelligence (IA)" and role == 'admin':
    st.subheader("🤖 Assistente Virtual de Negócios")
    st.info("Pergunte sobre estratégias, peça e-mails de cobrança ou tire dúvidas gerais. (Requer Chave API em Configurações)")
    if "messages" not in st.session_state: st.session_state.messages = []
    for message in st.session_state.messages:
        with st.chat_message(message["role"]): st.markdown(message["content"])
    if prompt := st.chat_input("Digite sua pergunta..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"): st.markdown(prompt)
        with st.spinner("Pensando..."): response = run_ai_chat(prompt)
        st.session_state.messages.append({"role": "assistant", "content": response})
        with st.chat_message("assistant"): st.markdown(response)

elif menu == "💰 Financeiro & DRE" and role == 'admin':
    st.subheader("💰 Gestão Financeira Completa"); t1, t2, t3 = st.tabs(["DRE Inteligente", "Fluxo de Caixa", "Lançamentos"])
    with t1:
        mes = st.selectbox("Competência", [(datetime.now()-relativedelta(months=i)).strftime("%Y-%m") for i in range(12)])
        dre = calcular_dre_avancado(mes)
        k1, k2, k3 = st.columns(3)
        k1.markdown(f"<div class='fin-card'><div class='fin-label'>Receita Bruta</div><div class='fin-value'>{format_brl(dre['Receita'])}</div></div>", unsafe_allow_html=True)
        # Proteção contra erros de cálculo (v103)
        try:
            peq = format_brl(dre.get('Ponto Equilíbrio', 0))
        except: peq = "R$ 0,00"
        
        k2.markdown(f"<div class='fin-card'><div class='fin-label'>Ponto de Equilíbrio</div><div class='fin-value'>{peq}</div></div>", unsafe_allow_html=True)
        cor = "fin-good" if dre['(=) Lucro Líquido'] >= 0 else "fin-bad"
        k3.markdown(f"<div class='fin-card'><div class='fin-label'>Lucro Líquido</div><div class='fin-value {cor}'>{format_brl(dre['(=) Lucro Líquido'])}</div></div>", unsafe_allow_html=True)
        st.divider(); st.text(f"(-) CMV: {format_brl(dre['Detalhe']['CMV'])}\n(-) Comissões: {format_brl(dre['Detalhe']['Comissões'])}\n(-) Frete Real: {format_brl(dre['Detalhe']['Frete Real'])}\n(-) Despesas Fixas: {format_brl(dre['(-) Custos Fixos'])}")
    with t2:
        df_fluxo = calcular_fluxo_caixa()
        st.bar_chart(df_fluxo.set_index("Mês")[["Entradas", "Saídas"]], color=["#10b981", "#ef4444"])
        st.dataframe(df_fluxo.style.format({'Entradas': 'R$ {:.2f}', 'Saídas': 'R$ {:.2f}', 'Saldo': 'R$ {:.2f}'}), use_container_width=True)
    with t3:
        # NOVO: FORMULÁRIO DE ADIÇÃO (v104)
        with st.form("d"):
            dc = st.text_input("Descrição"); vl = st.number_input("Valor", value=None, placeholder="0.00")
            tp = st.selectbox("Tipo", ["Fixa", "Variável"]); dt = st.date_input("Vencimento")
            is_rec = st.checkbox("🔄 Despesa Recorrente? (Repetir mensalmente)")
            qtd_rec = st.number_input("Repetir por quantos meses?", min_value=2, value=12) if is_rec else 1
            if st.form_submit_button("Lançar Despesa"):
                if is_rec:
                    for i in range(qtd_rec):
                        new_date = dt + relativedelta(months=i)
                        new_desc = f"{dc} ({i+1}/{qtd_rec})"
                        conn.execute("INSERT INTO despesas (data_despesa, descricao, valor, tipo) VALUES (?,?,?,?)", (new_date, new_desc, vl or 0.0, tp))
                else: conn.execute("INSERT INTO despesas (data_despesa, descricao, valor, tipo) VALUES (?,?,?,?)", (dt, dc, vl or 0.0, tp))
                conn.commit(); st.success("Lançado!"); st.rerun()
        
        st.divider()
        st.markdown("##### ✏️ Gerenciar Despesas Existentes")
        # NOVO: EDIÇÃO E EXCLUSÃO (v105)
        df_desp = pd.read_sql("SELECT id, data_despesa, descricao, categoria, valor, tipo FROM despesas ORDER BY data_despesa DESC", conn)
        evt_desp = st.dataframe(df_desp, selection_mode="single-row", on_select="rerun", use_container_width=True, hide_index=True)
        
        if evt_desp.selection.rows:
            sel_idx = evt_desp.selection.rows[0]
            d_id = df_desp.iloc[sel_idx]['id']
            row = df_desp.iloc[sel_idx]
            
            with st.form(f"edit_d_{d_id}"):
                st.info(f"Editando: {row['descricao']}")
                c1, c2 = st.columns(2)
                ndt = c1.date_input("Data", datetime.strptime(row['data_despesa'], '%Y-%m-%d'))
                ndc = c2.text_input("Descrição", row['descricao'])
                nvl = c1.number_input("Valor", value=float(row['valor']))
                ntp = c2.selectbox("Tipo", ["Fixa", "Variável"], index=0 if row['tipo']=="Fixa" else 1)
                
                c_btn1, c_btn2 = st.columns(2)
                if c_btn1.form_submit_button("💾 Salvar Alterações"):
                    conn.execute("UPDATE despesas SET data_despesa=?, descricao=?, valor=?, tipo=? WHERE id=?", (ndt, ndc, nvl, ntp, int(d_id)))
                    conn.commit(); st.success("Atualizado!"); time.sleep(1); st.rerun()
                
                if c_btn2.form_submit_button("🗑️ EXCLUIR DESPESA", type="primary"):
                    conn.execute("DELETE FROM despesas WHERE id=?", (int(d_id),))
                    conn.commit(); st.warning("Apagado."); time.sleep(1); st.rerun()

elif menu == "🏦 Prudent (Antecipação)" and role == 'admin':
    st.subheader("🏦 Central de Antecipação de Recebíveis")
    q_pend = """SELECT id, data_venda, produto_nome, valor_venda, parcelas, valor_parcela, antecipada FROM vendas ORDER BY data_venda DESC, id DESC"""
    df_pend = pd.read_sql(q_pend, conn)
    if not df_pend.empty:
        df_pend['Status'] = df_pend['antecipada'].apply(lambda x: 'Antecipada' if x == 1 else 'Pendente')
        df_pend['Selecionar'] = False
        edited_df = st.data_editor(df_pend, column_config={"Selecionar": st.column_config.CheckboxColumn(required=True)}, hide_index=True, use_container_width=True)
        sel_rows = edited_df[edited_df['Selecionar'] == True]
        pendentes_sel = sel_rows[sel_rows['antecipada'] == 0] if 'antecipada' in sel_rows.columns else sel_rows
        total_ant = pendentes_sel['valor_venda'].sum() if not pendentes_sel.empty else 0
        st.divider(); c1, c2 = st.columns(2); c1.metric("Total Selecionado (pendentes)", format_brl(total_ant))
        if c2.button("💰 ANTECIPAR SELECIONADOS", type="primary"):
            ids = pendentes_sel['id'].tolist() if not pendentes_sel.empty else []
            if ids:
                conn.execute(f"UPDATE vendas SET antecipada=1 WHERE id IN ({','.join(map(str, ids))})"); conn.commit()
                st.success(f"{len(ids)} vendas antecipadas com sucesso!"); time.sleep(1); st.rerun()
            elif not sel_rows.empty:
                st.info("Selecione vendas com status 'Pendente' para antecipar.")
    else: st.info("Nenhuma venda cadastrada.")

elif menu == "📥 Importação" and role == 'admin':
    st.subheader("📥 Importação de Vendas em Massa")
    def gerar_modelo_importacao():
        df = pd.DataFrame(columns=["Data (AAAA-MM-DD)", "Vendedor", "Cliente", "Produto", "Custo Produto", "Valor Venda", "Frete Cobrado", "Custo Envio", "Parcelas", "Antecipada (S/N)"])
        return df.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Baixar Modelo CSV", data=gerar_modelo_importacao(), file_name="modelo_importacao_bfx.csv", mime="text/csv")
    up_file = st.file_uploader("Subir Planilha (CSV)", type=['csv'])
    if up_file:
        try:
            df_imp = pd.read_csv(up_file)
            if st.button(f"Processar {len(df_imp)} Linhas"):
                prog = st.progress(0); sucesso = 0
                for i, row in df_imp.iterrows():
                    c_nome = str(row['Cliente']).strip()
                    c_id = conn.execute("SELECT id FROM clientes WHERE nome=?", (c_nome,)).fetchone()
                    if not c_id:
                        conn.execute("INSERT INTO clientes (nome, tipo) VALUES (?, 'PF')", (c_nome,))
                        c_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                    else: c_id = c_id[0]
                    ant = 1 if str(row['Antecipada (S/N)']).upper() in ['S','SIM','1','TRUE'] else 0
                    vp = (float(row['Valor Venda']) + float(row['Frete Cobrado'])) / int(row['Parcelas'])
                    conn.execute("""INSERT INTO vendas (data_venda, vendedor, cliente_id, produto_nome, custo_produto, valor_venda, valor_frete, custo_envio, parcelas, valor_parcela, antecipada) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                        (row['Data (AAAA-MM-DD)'], row['Vendedor'], c_id, row['Produto'], row['Custo Produto'], row['Valor Venda'], row['Frete Cobrado'], row['Custo Envio'], row['Parcelas'], vp, ant))
                    prog.progress((i + 1) / len(df_imp)); sucesso += 1
                conn.commit(); st.success("Importação concluída!"); time.sleep(2); st.rerun()
        except Exception as e: st.error(f"Erro: {e}")

elif menu == "Venda Rápida":
    st.subheader("🛒 Terminal de Vendas (POS)")
    c1, c2 = st.columns(2)
    dt = c1.date_input("Data Venda", datetime.now())
    vend = c2.selectbox("Vendedor Responsável", [nome_user] if role=='vendedor' else ["Bruno","Jakeline","Felipe"])
    dc = pd.read_sql("SELECT id, nome FROM clientes ORDER BY nome", conn); cli = st.selectbox("Selecione o Cliente", ["..."]+dc['nome'].tolist())
    if cli != "...":
        dcli = pd.read_sql(f"SELECT * FROM clientes WHERE nome='{cli}'", conn).iloc[0]
        ok, disp, tom, teto = check_credito(dcli['id'], 0)
        st.markdown(f"<div class='credit-box'>DISP: <b>{format_brl(disp)}</b> | LIMITE: {format_brl(teto)}</div>", unsafe_allow_html=True)
        c1, c2 = st.columns(2)
        dp = pd.read_sql("SELECT nome, custo_padrao FROM produtos", conn)
        prods = c1.multiselect("Produtos", dp['nome'].tolist())
        custo = 0.0
        if prods: custo = dp[dp['nome'].isin(prods)]['custo_padrao'].sum()
        if role == 'admin': custo = c1.number_input("Custo Total", value=custo)
        st.markdown("---")
        k1, k2, k3 = st.columns(3)
        val = k1.number_input("Valor Produtos", value=None, placeholder="0.00", step=0.01)
        frete_cobrado = k2.number_input("Frete (Cobrado Cliente)", value=None, placeholder="0.00", step=0.01)
        custo_envio = k3.number_input("Custo Envio (Logística)", value=None, placeholder="0.00", step=0.01, help="Quanto você paga para enviar. Não aparece para o cliente.")
        parc = st.selectbox("Qtd Parcelas", range(1,13))
        opcoes_pagamento = ["Desconto em folha"]
        if ASAAS_API_KEY:
            opcoes_pagamento.append("Boleto")
        forma_pag = st.selectbox("Forma de pagamento", opcoes_pagamento)
        forma_db = "boleto" if forma_pag == "Boleto" else "desconto_folha"
        v_safe = val or 0.0; f_safe = frete_cobrado or 0.0; c_safe = custo_envio or 0.0
        total_venda = v_safe + f_safe
        val_parc = total_venda / parc if parc > 0 else 0
        lucro_sim = total_venda - (custo + c_safe)
        margem_sim = (lucro_sim / total_venda * 100) if total_venda > 0 else 0
        s1, s2, s3 = st.columns(3)
        s1.metric("Parcela", format_brl(val_parc))
        s2.metric("Lucro Estimado", format_brl(lucro_sim), f"{margem_sim:.1f}%")
        s3.metric("Faturamento Total", format_brl(total_venda))
        if st.button("💾 FINALIZAR VENDA", type="primary"):
            try:
                conn.execute("""INSERT INTO vendas (data_venda, vendedor, cliente_id, produto_nome, custo_produto, valor_venda, valor_frete, custo_envio, parcelas, valor_parcela, antecipada, forma_pagamento, asaas_boleto_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                             (dt, vend, int(dcli['id']), " + ".join(prods), custo, v_safe, f_safe, custo_envio or 0.0, parc, val_parc, 0, forma_db, None))
                conn.commit()
                last_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                boletos_list = []
                if forma_db == "boleto":
                    primeiro_venc = (datetime.now() + timedelta(days=5)).date()
                    cliente_asaas = {"nome": dcli.get("nome") or cli, "c": cli, "cpf": dcli.get("cpf"), "cnpj": dcli.get("cnpj"), "telefone": dcli.get("telefone")}
                    boletos_list, err = criar_boletos_asaas(cliente_asaas, total_venda, parc, val_parc, primeiro_venc, descricao=f"Venda BFX #{last_id}")
                    if err:
                        st.warning(f"Venda salva, mas boleto não gerado: {err}")
                    elif boletos_list:
                        conn.execute("UPDATE vendas SET asaas_boleto_json = ? WHERE id = ?", (json.dumps(boletos_list), last_id))
                        conn.commit()
                st.success("Venda Realizada!")
                st.session_state['vf'] = {'c': cli, 'v': v_safe, 'p': " + ".join(prods), 'vp': val_parc, 'pa': parc, 'frete': f_safe, 'e': dcli['empresa'], 'cpf': dcli.get('cpf') or dcli.get('cnpj'), 'm': dcli.get('matricula', ''), 'forma_pagamento': forma_db, 'boletos': boletos_list}
                time.sleep(0.5); st.rerun()
            except Exception as e:
                if "no such column" in str(e):
                    st.warning("Atualizando banco de dados... Tente novamente em 2 segundos.")
                    try:
                        conn.execute("ALTER TABLE vendas ADD COLUMN lucro_liquido REAL DEFAULT 0"); conn.commit()
                        conn.execute("ALTER TABLE vendas ADD COLUMN forma_pagamento TEXT"); conn.commit()
                        conn.execute("ALTER TABLE vendas ADD COLUMN asaas_boleto_json TEXT"); conn.commit()
                    except: pass
                    time.sleep(2); st.rerun()
                else: st.error(f"Erro na venda: {e}")
        if 'vf' in st.session_state:
            vf = st.session_state['vf']
            st.divider()
            boletos = vf.get('boletos') or []
            if boletos:
                st.markdown("**📄 Boletos**")
                cols_b = st.columns(min(len(boletos), 4))
                for i, b in enumerate(boletos):
                    url = b.get("bankSlipUrl") or ""
                    with cols_b[i % len(cols_b)]:
                        if url:
                            st.link_button(f"📥 Boleto Parcela {b.get('parcela', i+1)}", url, use_container_width=True)
                st.markdown("---")
            c_recibo, c_padrao, c_zap = st.columns(3)
            pdf_recibo = gerar_pdf(vf, "recibo")
            c_recibo.download_button("📥 Recibo e Autorização (Desconto em Folha)", data=pdf_recibo, file_name="recibo_autorizacao.pdf", mime="application/pdf", use_container_width=True)
            pdf_padrao = gerar_pdf(vf, "recibo_padrao")
            c_padrao.download_button("📥 Recibo Padrão", data=pdf_padrao, file_name="recibo_padrao.pdf", mime="application/pdf", use_container_width=True)
            msg = f"Olá {vf['c']}, segue seu comprovante."
            link = f"https://wa.me/{clean_str(dcli['telefone'])}?text={urllib.parse.quote(msg)}"
            c_zap.markdown(f'<a href="{link}" target="_blank" class="whatsapp-btn">🟢 Enviar no WhatsApp</a>', unsafe_allow_html=True)

elif menu == "Cadastros":
    st.subheader("📝 Cadastros (Clássico)"); t1, t2, t3 = st.tabs(["Clientes", "Produtos", "Empresas"])
    with t1:
        with st.expander("➕ Novo Cliente"):
            tipo_p = st.radio("Tipo de Pessoa", ["Física", "Jurídica"], horizontal=True)
            with st.form("nc"):
                c1, c2 = st.columns(2)
                nm = c1.text_input("Nome/Razão Social")
                if tipo_p == "Física": doc = c2.text_input("CPF"); mat = c1.text_input("Matrícula"); renda = c2.number_input("Renda Mensal", value=1550.0)
                else: doc = c2.text_input("CNPJ"); mat = ""; renda = c2.number_input("Faturamento Mensal", value=10000.0)
                tel = c1.text_input("WhatsApp"); cep = c2.text_input("CEP")
                emp = st.selectbox("Empresa/Vínculo", ["Sem Vínculo"] + pd.read_sql("SELECT nome FROM empresas_parceiras", conn)['nome'].tolist())
                if st.form_submit_button("Salvar"):
                    if tipo_p == "Física": conn.execute("INSERT INTO clientes (nome, cpf, telefone, cep, renda, empresa, matricula, tipo) VALUES (?,?,?,?,?,?,?,?)", (nm, clean_str(doc), clean_str(tel), clean_str(cep), renda, emp, mat, 'PF'))
                    else: conn.execute("INSERT INTO clientes (nome, cnpj, telefone, cep, renda, empresa, tipo) VALUES (?,?,?,?,?,?,?)", (nm, clean_str(doc), clean_str(tel), clean_str(cep), renda, emp, 'PJ'))
                    conn.commit(); st.success("Salvo!"); st.rerun()
        st.divider(); st.info("💡 Clique para editar:")
        try: df_cli = pd.read_sql("SELECT id, nome, telefone, cpf, cnpj, empresa, renda FROM clientes ORDER BY nome", conn)
        except: st.warning("Atualizando tabela clientes..."); st.cache_resource.clear(); time.sleep(1); st.rerun()
        evt_cli = st.dataframe(df_cli, hide_index=True, use_container_width=True, on_select="rerun", selection_mode="single-row")
        if evt_cli.selection.rows:
            cid = df_cli.iloc[evt_cli.selection.rows[0]]['id']
            d_cli = pd.read_sql(f"SELECT * FROM clientes WHERE id={cid}", conn).iloc[0]
            st.markdown(f"**Editando: {d_cli['nome']}**")
            with st.form(f"ed_c_{cid}"):
                c1, c2 = st.columns(2)
                enm = c1.text_input("Nome", d_cli['nome'])
                if d_cli.get('tipo') == 'PJ' or d_cli.get('cnpj'): edoc = c2.text_input("CNPJ", mask_cpf(d_cli.get('cnpj','')))
                else: edoc = c2.text_input("CPF", mask_cpf(d_cli.get('cpf','')))
                etel = c1.text_input("Zap", mask_tel(d_cli['telefone'])); ecep = c2.text_input("CEP", mask_cep(d_cli['cep']))
                eend = c1.text_input("Endereço", d_cli['endereco']); eren = c2.number_input("Renda/Faturamento", value=float(d_cli['renda'] or 0))
                l_e = ["Sem Vínculo"] + pd.read_sql("SELECT nome FROM empresas_parceiras", conn)['nome'].tolist()
                idx_e = l_e.index(d_cli['empresa']) if d_cli['empresa'] in l_e else 0
                eemp = c1.selectbox("Empresa", l_e, index=idx_e)
                if st.form_submit_button("Atualizar"):
                    if d_cli.get('tipo') == 'PJ': conn.execute("UPDATE clientes SET nome=?, cnpj=?, telefone=?, cep=?, endereco=?, renda=?, empresa=? WHERE id=?", (enm, clean_str(edoc), clean_str(etel), clean_str(ecep), eend, eren, eemp, cid))
                    else: conn.execute("UPDATE clientes SET nome=?, cpf=?, telefone=?, cep=?, endereco=?, renda=?, empresa=? WHERE id=?", (enm, clean_str(edoc), clean_str(etel), clean_str(ecep), eend, eren, eemp, cid))
                    conn.commit(); st.success("Atualizado!"); time.sleep(1); st.rerun()
    with t2:
        with st.expander("➕ Novo Produto"):
            df_f = pd.read_sql("SELECT id, nome FROM fornecedores ORDER BY nome", conn)
            l_f = ["Novo Fornecedor..."] + df_f['nome'].tolist()
            f_sel = st.selectbox("Fornecedor", l_f)
            with st.form("np"):
                c1, c2 = st.columns(2)
                nm = c1.text_input("Nome Produto"); sug = sugerir_ncm(nm)
                if sug: c1.caption(f"Sugestão NCM: {sug}")
                ncm = c1.text_input("NCM", value=sug if sug else "")
                cst = c2.number_input("Custo", value=None, placeholder="0.00"); mk = c2.text_input("Marca")
                val_v = c1.number_input("Valor de Venda (Catálogo)", value=None, placeholder="0.00")
                nf_n = ""; nf_t = ""
                if f_sel == "Novo Fornecedor...": st.divider(); st.caption("Cadastrando Novo Fornecedor:"); nf_n = st.text_input("Nome Novo Fornecedor"); nf_t = st.text_input("WhatsApp Fornecedor")
                up_img = c2.file_uploader("Foto do Produto", type=['png','jpg'])
                if st.form_submit_button("Salvar Produto"):
                    fid = None
                    if f_sel == "Novo Fornecedor..." and nf_n:
                        # PROTEÇÃO CONTRA DUPLICIDADE DE FORNECEDOR (v114)
                        try:
                            conn.execute("INSERT INTO fornecedores (nome, telefone) VALUES (?,?)", (nf_n, clean_str(nf_t)))
                            fid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                        except sqlite3.IntegrityError:
                            # Se já existe, pega o ID do existente
                            fid = conn.execute("SELECT id FROM fornecedores WHERE nome=?", (nf_n,)).fetchone()[0]
                            st.toast(f"Fornecedor '{nf_n}' já existia e foi selecionado.")
                            
                    elif f_sel != "Novo Fornecedor...": fid = df_f[df_f['nome']==f_sel].iloc[0]['id']
                    
                    b64_img = image_to_base64(up_img)
                    
                    # PROTEÇÃO CONTRA PRODUTO DUPLICADO (v114)
                    try:
                        conn.execute("INSERT INTO produtos (nome, custo_padrao, marca, ncm, fornecedor_id, imagem, valor_venda) VALUES (?,?,?,?,?,?,?)", (nm, cst or 0.0, mk, ncm, fid, b64_img, val_v or 0.0))
                        conn.commit(); st.success("Salvo!"); st.rerun()
                    except sqlite3.IntegrityError:
                        st.error(f"O produto '{nm}' já existe!")
                    except Exception as e:
                        st.error(f"Erro ao salvar: {e}")

        st.markdown("---")
        if st.button("📄 Gerar Catálogo de Produtos PDF"):
            try:
                df_cat = pd.read_sql("SELECT nome, marca, valor_venda, imagem FROM produtos ORDER BY nome", conn)
                if not df_cat.empty:
                    pdf_cat = gerar_pdf({'df': df_cat}, "catalogo")
                    st.download_button("📥 Baixar Catálogo", data=pdf_cat, file_name="Catalogo_Produtos.pdf", mime="application/pdf")
                    st.info("Dica: Baixe o arquivo e arraste para o WhatsApp Web abaixo.")
                    st.markdown('<a href="https://web.whatsapp.com/" target="_blank" class="whatsapp-btn">🟢 Abrir WhatsApp Web</a>', unsafe_allow_html=True)
                else: st.warning("Cadastre produtos com 'Valor de Venda' primeiro.")
            except: st.error("Erro ao gerar catálogo. Verifique se a coluna 'valor_venda' existe.")
        st.divider(); st.info("💡 Clique para editar:")
        try: df_prod = pd.read_sql("SELECT p.id, p.nome, p.custo_padrao, p.valor_venda, p.marca, f.nome as Fornecedor FROM produtos p LEFT JOIN fornecedores f ON p.fornecedor_id = f.id ORDER BY p.nome", conn)
        except Exception as e:
            if "no such column" in str(e):
                st.warning("⚠️ Reparando banco de dados..."); 
                try: conn.execute("ALTER TABLE produtos ADD COLUMN valor_venda REAL DEFAULT 0"); conn.commit()
                except: pass
                st.cache_resource.clear(); time.sleep(1); st.rerun()
            else: st.error(f"Erro: {e}"); df_prod = pd.DataFrame()
        if not df_prod.empty:
            evt_prod = st.dataframe(df_prod, hide_index=True, use_container_width=True, on_select="rerun", selection_mode="single-row")
            if evt_prod.selection.rows:
                pid = df_prod.iloc[evt_prod.selection.rows[0]]['id']
                d_prod = pd.read_sql(f"SELECT * FROM produtos WHERE id={pid}", conn).iloc[0]
                st.markdown(f"**✏️ Editando: {d_prod['nome']}**")
                with st.form(f"ed_p_{pid}"):
                    c1, c2 = st.columns(2)
                    pnm = c1.text_input("Nome", d_prod['nome']); pcst = c2.number_input("Custo", value=float(d_prod['custo_padrao'] or 0))
                    pmk = c1.text_input("Marca", d_prod['marca']); pncm = c2.text_input("NCM", value=d_prod.get('ncm',''))
                    pval = c1.number_input("Valor Venda (Catálogo)", value=float(d_prod.get('valor_venda', 0) or 0))
                    l_forns = ["Sem Fornecedor"] + pd.read_sql("SELECT nome FROM fornecedores", conn)['nome'].tolist()
                    fname = "Sem Fornecedor"
                    if d_prod['fornecedor_id']:
                        res = conn.execute(f"SELECT nome FROM fornecedores WHERE id={d_prod['fornecedor_id']}").fetchone(); fname = res[0] if res else "Sem Fornecedor"
                    idx_f = l_forns.index(fname) if fname in l_forns else 0
                    pforn = st.selectbox("Fornecedor", l_forns, index=idx_f)
                    if d_prod['imagem']: st.image(base64_to_image(d_prod['imagem']), width=100)
                    up_new = st.file_uploader("Trocar Foto", type=['png','jpg'])
                    if st.form_submit_button("Atualizar"):
                        fid_new = None
                        if pforn != "Sem Fornecedor": fid_new = conn.execute(f"SELECT id FROM fornecedores WHERE nome='{pforn}'").fetchone()[0]
                        q_up = "UPDATE produtos SET nome=?, custo_padrao=?, marca=?, ncm=?, fornecedor_id=?, valor_venda=?"; params = [pnm, pcst, pmk, pncm, fid_new, pval]
                        if up_new: q_up += ", imagem=?"; params.append(image_to_base64(up_new))
                        q_up += " WHERE id=?"; params.append(pid)
                        conn.execute(q_up, params); conn.commit(); st.success("Atualizado!"); time.sleep(1); st.rerun()
    with t3:
        with st.expander("➕ Nova Empresa"):
            with st.form("ne"):
                nm = st.text_input("Empresa"); rh = st.text_input("RH"); tel = st.text_input("Zap"); mail = st.text_input("Email")
                if st.form_submit_button("Salvar"): conn.execute("INSERT INTO empresas_parceiras (nome, responsavel_rh, telefone_rh, email_rh) VALUES (?,?,?,?)", (nm, rh, tel, mail)); conn.commit(); st.success("Ok"); st.rerun()
        st.divider()
        df_emp = pd.read_sql("SELECT id, nome, responsavel_rh, telefone_rh, email_rh FROM empresas_parceiras ORDER BY nome", conn)
        edit_emp = st.data_editor(df_emp, hide_index=True, use_container_width=True, key="ed_emp", column_config={"id": st.column_config.NumberColumn(disabled=True)})
        if st.button("💾 SALVAR EMPRESAS"):
            for i, r in edit_emp.iterrows():
                conn.execute("UPDATE empresas_parceiras SET nome=?, responsavel_rh=?, telefone_rh=?, email_rh=? WHERE id=?", (r['nome'], r['responsavel_rh'], r['telefone_rh'], r['email_rh'], r['id']))
            conn.commit(); st.success("Atualizado!"); time.sleep(1); st.rerun()

elif menu == "Minhas Comissões":
    st.info("Extrato disponível.")
