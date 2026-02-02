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
    
    .fin-card { background: white; padding: 15px; border-radius: 10px; border: 1px solid #e5e7eb; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .fin-label { font-size: 12px; color: #6b7280; font-weight: 700; text-transform: uppercase; }
    .fin-value { font-size: 24px; color: #111827; font-weight: 800; margin-top: 5px; }
    .fin-good { color: #059669; } .fin-bad { color: #dc2626; }

    .stButton button { width: 100%; border-radius: 10px; height: 3.2em; font-weight: 600; border: none; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; transition: all 0.2s; }
    .stButton button:hover { box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); opacity: 0.95; }
    
    .whatsapp-btn { 
        display: inline-flex; align-items: center; justify-content: center; width: 100%; 
        background: linear-gradient(90deg, #25D366 0%, #128C7E 100%); 
        color: white !important; padding: 12px; border-radius: 10px; 
        text-decoration: none; font-weight: bold; margin-top: 10px; 
        box-shadow: 0 4px 10px rgba(37, 211, 102, 0.2); border: 1px solid #1DA851;
    }
    .whatsapp-btn:hover { transform: translateY(-2px); }

    .kpi-box { background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center; }
    .credit-box { background: linear-gradient(to right, #eff6ff, #dbeafe); border: 1px solid #bfdbfe; color: #1e40af; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 15px; }
    .cal-day-box { border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px; min-height: 70px; background: white; font-size: 12px; }
    .cal-val-green { background-color: #dcfce7; color: #166534; font-size: 10px; padding: 2px 4px; border-radius: 4px; display: block; margin-top: 4px; font-weight: bold; }
    .podio-box { background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center; margin-bottom: 20px; }
    .podio-rank { font-size: 13px; font-weight: 600; color: #334155; margin: 6px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
    .mural-aviso { background-color: #fefce8; border-left: 4px solid #facc15; color: #854d0e; padding: 12px; border-radius: 6px; font-size: 13px; margin-bottom: 20px; line-height: 1.4; }

    @media only screen and (max-width: 600px) { [data-testid="stSidebar"] { min-width: 100% !important; } h1 { font-size: 1.5rem !important; } }
</style>
""", unsafe_allow_html=True)

# ==============================================================================
# 2. BANCO DE DADOS (COM AUTO-REPARO)
# ==============================================================================
@st.cache_resource
def get_connection(): return sqlite3.connect('bfx_sistema.db', check_same_thread=False)
conn = get_connection()

def init_db():
    c = conn.cursor()
    # Criação inicial (se não existir)
    tables = [
        '''CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, renda REAL, empresa TEXT, matricula TEXT, telefone TEXT, cpf TEXT, cnpj TEXT, tipo TEXT, data_nascimento DATE, cep TEXT, endereco TEXT)''',
        '''CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, custo_padrao REAL, marca TEXT, categoria TEXT, ncm TEXT, imagem TEXT, fornecedor_id INTEGER, qtd_estoque INTEGER DEFAULT 0)''',
        '''CREATE TABLE IF NOT EXISTS vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, data_venda DATE, vendedor TEXT, cliente_id INTEGER, produto_nome TEXT, custo_produto REAL, valor_venda REAL, valor_frete REAL DEFAULT 0, custo_envio REAL DEFAULT 0, parcelas INTEGER, valor_parcela REAL, taxa_financeira_valor REAL, lucro_liquido REAL, antecipada INTEGER DEFAULT 1, excedeu_limite INTEGER DEFAULT 0, comprovante_pdf TEXT, FOREIGN KEY(cliente_id) REFERENCES clientes(id))''',
        '''CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY AUTOINCREMENT, modelo_contrato TEXT, logo_path TEXT)''',
        '''CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT, nome_exibicao TEXT, email TEXT, telefone TEXT, data_nascimento DATE, endereco TEXT, cep TEXT, meta_mensal REAL DEFAULT 50000.0, comissao_pct REAL DEFAULT 2.0)''',
        '''CREATE TABLE IF NOT EXISTS fornecedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, telefone TEXT)''',
        '''CREATE TABLE IF NOT EXISTS empresas_parceiras (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE, responsavel_rh TEXT, telefone_rh TEXT, email_rh TEXT)''',
        '''CREATE TABLE IF NOT EXISTS pagamentos (id INTEGER PRIMARY KEY AUTOINCREMENT, data_pagamento DATE, vendedor TEXT, valor REAL, obs TEXT)''',
        '''CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, data_hora DATETIME, usuario TEXT, acao TEXT, detalhes TEXT)''',
        '''CREATE TABLE IF NOT EXISTS despesas (id INTEGER PRIMARY KEY AUTOINCREMENT, data_despesa DATE, descricao TEXT, categoria TEXT, valor REAL, tipo TEXT)''',
        '''CREATE TABLE IF NOT EXISTS avisos (id INTEGER PRIMARY KEY AUTOINCREMENT, data_criacao DATETIME, mensagem TEXT, ativo INTEGER DEFAULT 1)'''
    ]
    for sql in tables: c.execute(sql)

    # FUNÇÃO DE REPARO DE COLUNAS (CRÍTICO PARA V100)
    def force_add_column(table, col, dtype):
        try:
            # Verifica se coluna existe
            existing_cols = [i[1] for i in c.execute(f"PRAGMA table_info({table})")]
            if col not in existing_cols:
                c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}")
                print(f"Coluna {col} adicionada em {table}")
        except Exception as e:
            print(f"Erro ao adicionar coluna {col}: {e}")

    # Força a criação das colunas novas
    force_add_column('clientes', 'cnpj', 'TEXT')
    force_add_column('clientes', 'tipo', 'TEXT')
    force_add_column('clientes', 'matricula', 'TEXT')
    force_add_column('clientes', 'cpf', 'TEXT')
    force_add_column('clientes', 'empresa', 'TEXT')
    
    force_add_column('produtos', 'valor_venda', 'REAL DEFAULT 0')
    force_add_column('produtos', 'ncm', 'TEXT')
    force_add_column('produtos', 'imagem', 'TEXT')
    
    force_add_column('vendas', 'comprovante_pdf', 'TEXT')
    force_add_column('vendas', 'lucro_liquido', 'REAL DEFAULT 0')

    # Usuários Padrão
    if c.execute("SELECT count(*) FROM usuarios").fetchone()[0] == 0:
        c.executemany("INSERT INTO usuarios (username, password, role, nome_exibicao) VALUES (?,?,?,?)", [("admin", "admin", "admin", "Administrador"), ("bruno", "bruno123#", "vendedor", "Bruno"), ("jakeline", "jak123!", "vendedor", "Jakeline"), ("felipe", "123", "vendedor", "Felipe")])
    
    # Empresas Padrão
    for emp in ["Amazon Five", "Gimam"]:
        if c.execute("SELECT count(*) FROM empresas_parceiras WHERE nome=?", (emp,)).fetchone()[0] == 0:
            c.execute("INSERT INTO empresas_parceiras (nome, responsavel_rh, telefone_rh, email_rh) VALUES (?,?,?,?)", (emp, "RH "+emp, "", ""))
    
    if c.execute("SELECT COUNT(*) FROM config").fetchone()[0] == 0:
        c.execute("INSERT INTO config (modelo_contrato, logo_path) VALUES (?, ?)", ("Texto Padrão...", ""))
    
    conn.commit()

# Executa init_db na inicialização
init_db()

# ==============================================================================
# 3. MÁSCARAS & UTILITÁRIOS
# ==============================================================================
def mask_cpf(val):
    v = re.sub(r'\D', '', str(val))
    return f"{v[:3]}.{v[3:6]}.{v[6:9]}-{v[9:]}" if len(v) == 11 else val
def mask_cnpj(val):
    v = re.sub(r'\D', '', str(val))
    return f"{v[:2]}.{v[2:5]}.{v[5:8]}/{v[8:12]}-{v[12:]}" if len(v) == 14 else val
def mask_tel(val):
    v = re.sub(r'\D', '', str(val))
    if len(v) == 11: return f"({v[:2]}) {v[2:7]}-{v[7:]}"
    if len(v) == 10: return f"({v[:2]}) {v[2:6]}-{v[6:]}"
    return val
def mask_cep(val):
    v = re.sub(r'\D', '', str(val))
    return f"{v[:5]}-{v[5:]}" if len(v) == 8 else val
def clean_str(val): return re.sub(r'\D', '', str(val)) if val else ""
def format_brl(v): return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if v else "R$ 0,00"
def gerar_link_zap(tel, msg): return f"https://wa.me/{clean_str(tel)}?text={urllib.parse.quote(msg)}" if tel else None

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
    return {"Receita": receita_bruta, "(-) Custos Var.": custos_var_totais, "(=) Margem Contrib.": margem_contrib, "(-) Custos Fixos": custo_fixo, "(=) Lucro Líquido": lucro_liquido, "Ponto Equilíbrio": ponto_equilibrio, "Meta Global": meta_global, "Detalhe": {"CMV": cmv, "Comissões": comissoes, "Desp. Var": desp_var, "Frete Real": custo_frete_real}}

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
    
    # CATÁLOGO DE PRODUTOS
    elif tipo == "catalogo":
        pdf.set_font("Arial", 'B', 16); pdf.cell(0, 10, "CATÁLOGO DE PRODUTOS", 0, 1, 'C'); pdf.ln(10)
        df_prod = dados['df']
        for i, r in df_prod.iterrows():
            pdf.set_fill_color(248, 250, 252) # Cinza claro
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
            # Visualização de Senha
            if 'show_pwd' not in st.session_state: st.session_state.show_pwd = False
            
            pwd_type = "default" if st.session_state.show_pwd else "password"
            pwd = st.text_input("Senha", type=pwd_type)
            
            if st.checkbox("Mostrar Senha"): st.session_state.show_pwd = True
            else: st.session_state.show_pwd = False
            
            if st.form_submit_button("ENTRAR"):
                res = conn.execute("SELECT id, password, role, nome_exibicao FROM usuarios WHERE username=?", (user,)).fetchone()
                if res and res[1] == pwd.strip(): # REMOVENDO ESPAÇOS
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
    
    if st.button("Sair"): 
        st.session_state['logged_in'] = False; st.rerun()
    
    st.markdown("---")
    if role == 'admin': menu = st.radio("Menu", ["Dashboard", "💰 Financeiro & DRE", "🏦 Prudent (Antecipação)", "📥 Importação", "Venda Rápida", "Histórico (Editar)", "Cadastros", "👥 Gestão de RH (Equipe)", "🖨️ Relatórios", "Configurações"])
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
# 6. CONTEÚDO PRINCIPAL
# ==============================================================================

if menu == "Dashboard" and role == 'admin':
    t1, t2, t3 = st.tabs(["📊 Visão Executiva", "🤝 Comercial", "📦 Operacional"])
    with t1:
        st.subheader("Visão Geral")
        c1, c2 = st.columns(2)
        with c1: st.download_button("💾 BAIXAR BACKUP", data=baixar_backup(), file_name=f"bfx_bkp.db", use_container_width=True)
        if not df_pod.empty:
            total_mes = df_pod['total'].sum()
            ticket = total_mes / pd.read_sql(f"SELECT COUNT(*) FROM vendas WHERE data_venda >= '{ini_mes}'", conn).iloc[0,0]
            c2.metric("Total Vendido", format_brl(total_mes), f"Ticket: {format_brl(ticket)}")
        st.markdown("---")
        mes_cal = st.selectbox("Mês", range(1,13), index=hj.month-1)
        dados_cal = get_calendario(hj.year, mes_cal); cal = calendar.monthcalendar(hj.year, mes_cal)
        cols = st.columns(7)
        for i, d in enumerate(["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"]): cols[i].markdown(f"**{d}**")
        for week in cal:
            cols = st.columns(7)
            for i, day in enumerate(week):
                with cols[i]:
                    if day!=0:
                        val = dados_cal.get(day, 0)
                        st.markdown(f"<div class='cal-day-box'>{day} {f'<br><span class=cal-val-green>+{format_brl(val)}</span>' if val>0 else ''}</div>", unsafe_allow_html=True)

    with t2:
        st.subheader("Inteligência Comercial")
        if not df_pod.empty:
            # CHART SIMPLIFICADO COMPATIVEL COM PYTHON 3.14
            st.bar_chart(df_pod.set_index("vendedor")['total'])
        st.markdown("#### 💤 Clientes Inativos (Win-Back)")
        q_inat = """SELECT c.nome, c.telefone, MAX(v.data_venda) as ultima FROM clientes c JOIN vendas v ON c.id=v.cliente_id GROUP BY c.id HAVING ultima < date('now','-90 days')"""
        df_inat = pd.read_sql(q_inat, conn)
        if not df_inat.empty: st.dataframe(df_inat, use_container_width=True)
        else: st.success("Nenhum cliente inativo.")

    with t3:
        st.subheader("Fornecedores e Encomendas")
        df_forn = pd.read_sql("SELECT nome, telefone FROM fornecedores ORDER BY nome", conn)
        if not df_forn.empty:
            cols = st.columns(4)
            for i, row in df_forn.iterrows():
                with cols[i % 4]:
                    link = gerar_link_zap(row['telefone'], f"Olá {row['nome']}, preciso de uma encomenda.")
                    st.markdown(f"<div class='css-card' style='text-align:center'><b>{row['nome']}</b><br><a href='{link}' target='_blank' style='text-decoration:none; color:#2563eb;'>📞 Encomendar</a></div>", unsafe_allow_html=True)

elif menu == "💰 Financeiro & DRE" and role == 'admin':
    st.subheader("💰 Gestão Financeira Completa"); t1, t2, t3 = st.tabs(["DRE Inteligente", "Fluxo de Caixa", "Lançamentos"])
    
    with t1:
        mes = st.selectbox("Competência", [(datetime.now()-relativedelta(months=i)).strftime("%Y-%m") for i in range(12)])
        dre = calcular_dre_avancado(mes)
        k1, k2, k3 = st.columns(3)
        k1.markdown(f"<div class='fin-card'><div class='fin-label'>Receita Bruta</div><div class='fin-value'>{format_brl(dre['Receita'])}</div></div>", unsafe_allow_html=True)
        k2.markdown(f"<div class='fin-card'><div class='fin-label'>Ponto de Equilíbrio</div><div class='fin-value'>{format_brl(dre['Ponto Equilíbrio'])}</div></div>", unsafe_allow_html=True)
        cor = "fin-good" if dre['(=) Lucro Líquido'] >= 0 else "fin-bad"
        k3.markdown(f"<div class='fin-card'><div class='fin-label'>Lucro Líquido</div><div class='fin-value {cor}'>{format_brl(dre['(=) Lucro Líquido'])}</div></div>", unsafe_allow_html=True)
        st.divider()
        st.markdown(f"**Progresso Meta Global:** {format_brl(dre['Receita'])} / {format_brl(dre['Meta Global'])}")
        st.progress(min(1.0, dre['Receita']/dre['Meta Global']) if dre['Meta Global']>0 else 0)
        st.divider()
        st.markdown("##### 📉 Detalhes")
        st.text(f"(-) CMV: {format_brl(dre['Detalhe']['CMV'])}\n(-) Comissões: {format_brl(dre['Detalhe']['Comissões'])}\n(-) Frete Real: {format_brl(dre['Detalhe']['Frete Real'])}\n(-) Despesas Fixas: {format_brl(dre['(-) Custos Fixos'])}")

    with t2:
        st.markdown("##### 📅 Fluxo de Caixa Projetado (6 Meses)")
        st.info("Considera todas as parcelas a receber e despesas lançadas.")
        df_fluxo = calcular_fluxo_caixa()
        # CHART NATIVO COMPATIVEL COM PYTHON 3.14
        st.bar_chart(df_fluxo.set_index("Mês")[["Entradas", "Saídas"]], color=["#10b981", "#ef4444"])
        st.dataframe(df_fluxo.style.format({'Entradas': 'R$ {:.2f}', 'Saídas': 'R$ {:.2f}', 'Saldo': 'R$ {:.2f}'}), use_container_width=True)

    with t3:
        with st.form("d"):
            dc = st.text_input("Descrição"); vl = st.number_input("Valor", value=None, placeholder="0.00")
            tp = st.selectbox("Tipo", ["Fixa", "Variável"]); dt = st.date_input("Vencimento")
            if st.form_submit_button("Lançar Despesa"):
                conn.execute("INSERT INTO despesas (data_despesa, descricao, valor, tipo) VALUES (?,?,?,?)", (dt, dc, vl or 0.0, tp)); conn.commit(); st.success("Lançado!"); st.rerun()
        st.dataframe(pd.read_sql("SELECT data_despesa, descricao, tipo, valor FROM despesas ORDER BY data_despesa DESC", conn), use_container_width=True)

elif menu == "🏦 Prudent (Antecipação)" and role == 'admin':
    st.subheader("🏦 Central de Antecipação de Recebíveis")
    st.info("Selecione as vendas que você deseja antecipar para converter o status de 'Mensal' para 'Antecipada'.")
    q_pend = """SELECT id, data_venda, produto_nome, valor_venda, parcelas, valor_parcela FROM vendas WHERE antecipada = 0"""
    df_pend = pd.read_sql(q_pend, conn)
    if not df_pend.empty:
        df_pend['Selecionar'] = False
        edited_df = st.data_editor(df_pend, column_config={"Selecionar": st.column_config.CheckboxColumn(required=True)}, hide_index=True, use_container_width=True)
        sel_rows = edited_df[edited_df['Selecionar'] == True]
        total_ant = sel_rows['valor_venda'].sum()
        st.divider()
        c1, c2 = st.columns(2)
        c1.metric("Total Selecionado", format_brl(total_ant))
        if c2.button("💰 ANTECIPAR SELECIONADOS", type="primary"):
            ids = sel_rows['id'].tolist()
            if ids:
                conn.execute(f"UPDATE vendas SET antecipada=1 WHERE id IN ({','.join(map(str, ids))})")
                conn.commit()
                st.success(f"{len(ids)} vendas antecipadas com sucesso!"); time.sleep(1); st.rerun()
            else: st.warning("Selecione pelo menos uma venda.")
    else: st.success("🎉 Nenhuma venda pendente de antecipação.")

elif menu == "📥 Importação" and role == 'admin':
    st.subheader("📥 Importação de Vendas em Massa")
    st.info("Use este módulo para subir vendas antigas. O sistema criará clientes automaticamente se não existirem.")
    def gerar_modelo_importacao():
        df = pd.DataFrame(columns=["Data (AAAA-MM-DD)", "Vendedor", "Cliente", "Produto", "Custo Produto", "Valor Venda", "Frete Cobrado", "Custo Envio", "Parcelas", "Antecipada (S/N)"])
        return df.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Baixar Modelo Planilha CSV", data=gerar_modelo_importacao(), file_name="modelo_importacao_bfx.csv", mime="text/csv")
    st.divider()
    up_file = st.file_uploader("Subir Planilha Preenchida (CSV)", type=['csv'])
    if up_file:
        try:
            df_imp = pd.read_csv(up_file)
            st.dataframe(df_imp.head())
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
                conn.commit(); st.success(f"Importação concluída! {sucesso} vendas processadas."); time.sleep(2); st.rerun()
        except Exception as e: st.error(f"Erro na leitura do arquivo: {e}")

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
        
        # Simulador
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
            conn.execute("INSERT INTO vendas (data_venda, vendedor, cliente_id, produto_nome, custo_produto, valor_venda, valor_frete, custo_envio, parcelas, valor_parcela, antecipada) VALUES (?,?,?,?,?,?,?,?,?,?,?)", 
                         (dt, vend, int(dcli['id']), " + ".join(prods), custo, v_safe, f_safe, custo_envio or 0.0, parc, val_parc, 1))
            conn.commit(); st.success("Venda Realizada!"); st.session_state['vf'] = {'c':cli, 'v':v_safe, 'p':" + ".join(prods), 'vp':val_parc, 'pa':parc, 'frete':f_safe, 'e':dcli['empresa'], 'cpf':dcli.get('cpf') or dcli.get('cnpj'), 'm':dcli.get('matricula','')}
            time.sleep(0.5); st.rerun()
            
        if 'vf' in st.session_state:
            st.divider(); c_pdf, c_zap = st.columns(2)
            pdf = gerar_pdf(st.session_state['vf'], "recibo")
            c_pdf.download_button("📥 Baixar PDF", data=pdf, file_name="recibo.pdf", mime="application/pdf", use_container_width=True)
            msg = f"Olá {st.session_state['vf']['c']}, segue seu comprovante."
            link = f"https://wa.me/{clean_str(dcli['telefone'])}?text={urllib.parse.quote(msg)}"
            c_zap.markdown(f'<a href="{link}" target="_blank" class="whatsapp-btn">🟢 Enviar no WhatsApp</a>', unsafe_allow_html=True)

elif menu == "Cadastros":
    st.subheader("📝 Cadastros (Clássico)"); t1, t2, t3 = st.tabs(["Clientes", "Produtos", "Empresas"])
    
    with t1:
        # BOTÃO FORA DO FORM
        with st.expander("➕ Novo Cliente"):
            tipo_p = st.radio("Tipo de Pessoa", ["Física", "Jurídica"], horizontal=True)
            with st.form("nc"):
                c1, c2 = st.columns(2)
                nm = c1.text_input("Nome/Razão Social")
                if tipo_p == "Física":
                    doc = c2.text_input("CPF")
                    mat = c1.text_input("Matrícula")
                    renda = c2.number_input("Renda Mensal", value=1550.0)
                else:
                    doc = c2.text_input("CNPJ")
                    mat = ""
                    renda = c2.number_input("Faturamento Mensal", value=10000.0)
                tel = c1.text_input("WhatsApp")
                cep = c2.text_input("CEP")
                emp = st.selectbox("Empresa/Vínculo", ["Sem Vínculo"] + pd.read_sql("SELECT nome FROM empresas_parceiras", conn)['nome'].tolist())
                if st.form_submit_button("Salvar"):
                    if tipo_p == "Física": conn.execute("INSERT INTO clientes (nome, cpf, telefone, cep, renda, empresa, matricula, tipo) VALUES (?,?,?,?,?,?,?,?)", (nm, clean_str(doc), clean_str(tel), clean_str(cep), renda, emp, mat, 'PF'))
                    else: conn.execute("INSERT INTO clientes (nome, cnpj, telefone, cep, renda, empresa, tipo) VALUES (?,?,?,?,?,?,?)", (nm, clean_str(doc), clean_str(tel), clean_str(cep), renda, emp, 'PJ'))
                    conn.commit(); st.success("Salvo!"); st.rerun()
        st.divider(); st.info("💡 Clique para editar:")
        df_cli = pd.read_sql("SELECT id, nome, telefone, cpf, cnpj, empresa, renda FROM clientes ORDER BY nome", conn)
        evt_cli = st.dataframe(df_cli, hide_index=True, use_container_width=True, on_select="rerun", selection_mode="single-row")
        if evt_cli.selection.rows:
            cid = df_cli.iloc[evt_cli.selection.rows[0]]['id']
            d_cli = pd.read_sql(f"SELECT * FROM clientes WHERE id={cid}", conn).iloc[0]
            st.markdown(f"**Editando: {d_cli['nome']}**")
            with st.form(f"ed_c_{cid}"):
                c1, c2 = st.columns(2)
                enm = c1.text_input("Nome", d_cli['nome'])
                if d_cli.get('tipo') == 'PJ' or d_cli.get('cnpj'):
                    edoc = c2.text_input("CNPJ", mask_cpf(d_cli.get('cnpj','')))
                else:
                    edoc = c2.text_input("CPF", mask_cpf(d_cli.get('cpf','')))
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
        # BOTÃO FORA DO FORM
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
                if f_sel == "Novo Fornecedor...":
                    st.divider(); st.caption("Cadastrando Novo Fornecedor:")
                    nf_n = st.text_input("Nome Novo Fornecedor")
                    nf_t = st.text_input("WhatsApp Fornecedor")
                
                up_img = c2.file_uploader("Foto do Produto", type=['png','jpg'])
                if st.form_submit_button("Salvar Produto"):
                    fid = None
                    if f_sel == "Novo Fornecedor..." and nf_n:
                        conn.execute("INSERT INTO fornecedores (nome, telefone) VALUES (?,?)", (nf_n, clean_str(nf_t)))
                        fid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                    elif f_sel != "Novo Fornecedor...":
                        fid = df_f[df_f['nome']==f_sel].iloc[0]['id']
                    b64_img = image_to_base64(up_img)
                    conn.execute("INSERT INTO produtos (nome, custo_padrao, marca, ncm, fornecedor_id, imagem, valor_venda) VALUES (?,?,?,?,?,?,?)", (nm, cst or 0.0, mk, ncm, fid, b64_img, val_v or 0.0))
                    conn.commit(); st.success("Salvo!"); st.rerun()
        
        # GERAR CATÁLOGO
        st.markdown("---")
        if st.button("📄 Gerar Catálogo de Produtos PDF"):
            df_cat = pd.read_sql("SELECT nome, marca, valor_venda, imagem FROM produtos ORDER BY nome", conn)
            if not df_cat.empty:
                pdf_cat = gerar_pdf({'df': df_cat}, "catalogo")
                st.download_button("📥 Baixar Catálogo", data=pdf_cat, file_name="Catalogo_Produtos.pdf", mime="application/pdf")
                st.info("Dica: Baixe o arquivo e arraste para o WhatsApp Web abaixo.")
                st.markdown('<a href="https://web.whatsapp.com/" target="_blank" class="whatsapp-btn">🟢 Abrir WhatsApp Web</a>', unsafe_allow_html=True)
            else: st.warning("Cadastre produtos com 'Valor de Venda' primeiro.")
        
        st.divider(); st.info("💡 Clique para editar:")
        df_prod = pd.read_sql("SELECT p.id, p.nome, p.custo_padrao, p.valor_venda, p.marca, f.nome as Fornecedor FROM produtos p LEFT JOIN fornecedores f ON p.fornecedor_id = f.id ORDER BY p.nome", conn)
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
                    res = conn.execute(f"SELECT nome FROM fornecedores WHERE id={d_prod['fornecedor_id']}").fetchone()
                    if res: fname = res[0]
                idx_f = l_forns.index(fname) if fname in l_forns else 0
                pforn = st.selectbox("Fornecedor", l_forns, index=idx_f)
                if d_prod['imagem']: st.image(base64_to_image(d_prod['imagem']), width=100)
                up_new = st.file_uploader("Trocar Foto", type=['png','jpg'])
                if st.form_submit_button("Atualizar"):
                    fid_new = None
                    if pforn != "Sem Fornecedor":
                        fid_new = conn.execute(f"SELECT id FROM fornecedores WHERE nome='{pforn}'").fetchone()[0]
                    q_up = "UPDATE produtos SET nome=?, custo_padrao=?, marca=?, ncm=?, fornecedor_id=?, valor_venda=?"
                    params = [pnm, pcst, pmk, pncm, fid_new, pval]
                    if up_new:
                        q_up += ", imagem=?"; params.append(image_to_base64(up_new))
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

elif menu == "Histórico (Editar)":
    st.subheader("📜 Histórico & Edição")
    
    # Filtros Avançados (CORRIGIDO)
    with st.expander("🔍 Filtros Avançados", expanded=True):
        c1, c2, c3, c4 = st.columns(4)
        f_ini = c1.date_input("De", datetime.now().replace(day=1))
        f_fim = c2.date_input("Até", datetime.now())
        f_cli = c3.text_input("Cliente")
        f_status = c4.selectbox("Status", ["Todos", "Antecipadas", "Mensais"])
        
        # Filtro de Vendedor (Admin)
        f_vend = "Todos"
        if role == 'admin':
            c5, c6 = st.columns(2)
            users = pd.read_sql("SELECT nome_exibicao FROM usuarios", conn)['nome_exibicao'].tolist()
            f_vend = c5.selectbox("Filtrar Vendedor", ["Todos"] + users)

    # Construção da Query
    q = "SELECT v.id, v.data_venda, v.vendedor, c.nome, v.produto_nome, v.valor_venda, v.valor_frete, v.custo_envio, v.lucro_liquido, v.antecipada, v.parcelas, v.comprovante_pdf FROM vendas v JOIN clientes c ON v.cliente_id=c.id WHERE 1=1"
    
    q += f" AND v.data_venda BETWEEN '{f_ini}' AND '{f_fim}'"
    
    if f_cli: 
        q += f" AND c.nome LIKE '%{f_cli}%'"
    
    if f_status == "Antecipadas": 
        q += " AND v.antecipada=1"
    elif f_status == "Mensais": 
        q += " AND v.antecipada=0"
    
    # Lógica de Vendedor
    if role != 'admin':
        q += f" AND v.vendedor = '{nome_user}'"
    elif f_vend != "Todos":
        q += f" AND v.vendedor = '{f_vend}'"
    
    q += " ORDER BY v.data_venda DESC LIMIT 100"
    
    df = pd.read_sql(q, conn)
    
    if not df.empty:
        cols_v = ['id','data_venda','vendedor','nome','produto_nome','valor_venda','antecipada']
        if role == 'admin': cols_v.append('lucro_liquido')
        df['Status'] = df['antecipada'].apply(lambda x: '⚡ Ant' if x==1 else '📅 Mes')
        df['Doc'] = df['comprovante_pdf'].apply(lambda x: '✅ OK' if x else '❌ Pend')
        
        evt = st.dataframe(df[cols_v + ['Status','Doc']], use_container_width=True, on_select="rerun", selection_mode="single-row", hide_index=True)
        
        if evt.selection.rows:
            v_sel = df.iloc[evt.selection.rows[0]]
            vid = int(v_sel['id'])
            st.markdown("---"); st.info(f"**Editando Venda #{vid} - {v_sel['nome']}**")
            t1, t2, t3 = st.tabs(["📄 Docs", "✏️ Dados", "🗑️ Excluir"])
            
            with t1:
                up = st.file_uploader("Subir PDF", type=['pdf','jpg'])
                if up and st.button("Salvar Doc"):
                    b64 = image_to_base64(up); conn.execute("UPDATE vendas SET comprovante_pdf=? WHERE id=?", (b64, vid)); conn.commit(); st.success("Salvo!"); st.rerun()
            
            with t2:
                with st.form(f"fe_{vid}"):
                    c1, c2 = st.columns(2)
                    ndt = c1.date_input("Data", datetime.strptime(v_sel['data_venda'], '%Y-%m-%d'))
                    nval = c2.number_input("Valor Venda", value=float(v_sel['valor_venda']), step=0.01)
                    nprod = st.text_input("Produtos", value=v_sel['produto_nome'])
                    c3, c4, c5 = st.columns(3)
                    nfrete = c3.number_input("Frete Cobrado", value=float(v_sel['valor_frete'] or 0), step=0.01)
                    ncusto_envio = c4.number_input("Custo Envio (Real)", value=float(v_sel.get('custo_envio',0) or 0), step=0.01)
                    nparc = c5.number_input("Parcelas", value=int(v_sel['parcelas']), min_value=1)
                    nant = st.checkbox("Antecipada?", value=(v_sel['antecipada']==1))
                    
                    if st.form_submit_button("Salvar Alterações"):
                        new_vp = (nval + nfrete) / nparc if nparc > 0 else 0
                        conn.execute("UPDATE vendas SET data_venda=?, valor_venda=?, produto_nome=?, valor_frete=?, custo_envio=?, parcelas=?, antecipada=?, valor_parcela=? WHERE id=?", (ndt, nval, nprod, nfrete, ncusto_envio, nparc, 1 if nant else 0, new_vp, vid))
                        conn.commit(); st.success("Atualizado!"); time.sleep(1); st.rerun()
            
            with t3:
                if role == 'admin':
                    if st.button("🗑️ EXCLUIR VENDA", type="primary"): conn.execute("DELETE FROM vendas WHERE id=?", (vid,)); conn.commit(); st.warning("Excluído."); time.sleep(1); st.rerun()
                else: st.warning("Apenas admin.")
    else:
        st.warning("Nenhuma venda encontrada com esses filtros.")

elif menu == "👥 Gestão de RH (Equipe)" and role == 'admin':
    st.subheader("👥 Gestão de Time")
    t1, t2, t3 = st.tabs(["📊 Metas & Comissões", "👤 Detalhes & Senha", "➕ Contratar"])
    with t1:
        st.info("Edite Metas e Comissões diretamente na tabela:")
        df_u = pd.read_sql("SELECT id, nome_exibicao, username, role, meta_mensal, comissao_pct FROM usuarios", conn)
        edit_u = st.data_editor(df_u, column_config={"id": st.column_config.NumberColumn(disabled=True), "role": st.column_config.SelectboxColumn("Cargo", options=["admin", "vendedor"])}, hide_index=True, use_container_width=True, key="ed_u")
        if st.button("💾 SALVAR METAS"):
            for i, r in edit_u.iterrows():
                conn.execute("UPDATE usuarios SET nome_exibicao=?, username=?, role=?, meta_mensal=?, comissao_pct=? WHERE id=?", (r['nome_exibicao'], r['username'], r['role'], r['meta_mensal'], r['comissao_pct'], r['id']))
            conn.commit(); st.success("Atualizado!"); time.sleep(1); st.rerun()
    with t2:
        list_users = pd.read_sql("SELECT nome_exibicao FROM usuarios", conn)['nome_exibicao'].tolist()
        sel_u = st.selectbox("Selecione o Funcionário:", list_users)
        if sel_u:
            du = pd.read_sql(f"SELECT * FROM usuarios WHERE nome_exibicao='{sel_u}'", conn).iloc[0]
            with st.form("edit_u_det"):
                c1, c2 = st.columns(2)
                unm = c1.text_input("Nome", du['nome_exibicao']); ulogin = c2.text_input("Login", du['username'])
                uemail = c1.text_input("Email", du.get('email','')); utel = c2.text_input("Telefone", du.get('telefone',''))
                uend = st.text_input("Endereço", du.get('endereco',''))
                new_pass = st.text_input("Nova Senha (Deixe em branco para manter)", type="password")
                if st.form_submit_button("Salvar Dados"):
                    q_up = "UPDATE usuarios SET nome_exibicao=?, username=?, email=?, telefone=?, endereco=?"
                    params = [unm, ulogin, uemail, utel, uend]
                    if new_pass.strip(): # Se tiver senha nova (sem espacos)
                        q_up += ", password=?"
                        params.append(new_pass.strip())
                    q_up += " WHERE id=?"
                    params.append(int(du['id']))
                    conn.execute(q_up, params); conn.commit(); st.success("Dados Salvos!"); time.sleep(1); st.rerun()
            st.markdown("---")
            if st.button(f"🗑️ DEMITIR (Excluir {sel_u})", type="primary"):
                conn.execute("DELETE FROM usuarios WHERE id=?", (du['id'],)); conn.commit(); st.warning("Usuário removido."); time.sleep(1); st.rerun()
    with t3:
        with st.form("new_u"):
            c1, c2 = st.columns(2)
            nn = c1.text_input("Nome Completo"); nu = c2.text_input("Login Acesso")
            np = c1.text_input("Senha Inicial", type="password"); nr = c2.selectbox("Cargo", ["vendedor", "admin"])
            if st.form_submit_button("Cadastrar"):
                conn.execute("INSERT INTO usuarios (username, password, role, nome_exibicao) VALUES (?,?,?,?)", (nu, np, nr, nn)); conn.commit(); st.success("Criado!"); st.rerun()

elif menu == "🖨️ Relatórios" and role == 'admin':
    st.subheader("🖨️ Central de Relatórios")
    t1, t2 = st.tabs(["📄 Relatório Parceiros (Folha)", "📊 Relatório Geral Vendas"])
    with t1:
        st.info("Relatório para descontar em folha (Gimam/Amazon Five)")
        col_comp, col_mes = st.columns(2)
        empresa_sel = col_comp.selectbox("Selecione a Empresa", pd.read_sql("SELECT nome FROM empresas_parceiras", conn)['nome'].tolist())
        mes_rel = col_mes.selectbox("Mês de Referência", [(datetime.now()-relativedelta(months=i)).strftime("%Y-%m") for i in range(12)])
        if st.button("Gerar Relatório Folha"):
            df_folha, total_folha = calcular_relatorio_parceiro(empresa_sel, mes_rel)
            if not df_folha.empty:
                st.success(f"Encontrados {len(df_folha)} funcionários.")
                st.dataframe(df_folha, use_container_width=True)
                st.markdown(f"**TOTAL: {format_brl(total_folha)}**")
                pdf_bytes = gerar_pdf({'empresa': empresa_sel, 'mes': mes_rel, 'df': df_folha, 'total': total_folha}, "rh")
                st.download_button(label="📥 Baixar PDF Folha", data=pdf_bytes, file_name=f"Relatorio_{empresa_sel}_{mes_rel}.pdf", mime="application/pdf")
            else: st.warning("Sem dados.")
    with t2:
        st.info("Relatório completo de todas as vendas do período")
        c_ini, c_fim = st.columns(2)
        d_ini = c_ini.date_input("De", datetime.now().replace(day=1))
        d_fim = c_fim.date_input("Até", datetime.now())
        if st.button("Gerar Relatório Geral"):
            q_geral = f"SELECT v.data_venda, c.nome, v.produto_nome, v.valor_venda, v.antecipada FROM vendas v JOIN clientes c ON v.cliente_id=c.id WHERE v.data_venda BETWEEN '{d_ini}' AND '{d_fim}'"
            df_geral = pd.read_sql(q_geral, conn)
            if not df_geral.empty:
                st.dataframe(df_geral)
                pdf_g = gerar_pdf({'periodo': f"{d_ini} a {d_fim}", 'df': df_geral, 'total': df_geral['valor_venda'].sum()}, "geral")
                st.download_button(label="📥 Baixar Relatório Geral PDF", data=pdf_g, file_name="Relatorio_Geral.pdf", mime="application/pdf")
            else: st.warning("Sem vendas no período.")

elif menu == "Configurações" and role == 'admin':
    st.subheader("⚙️ Configurações do Sistema")
    tab_mural, tab_doc = st.tabs(["📢 Mural de Avisos", "📄 Texto do Recibo/Contrato"])
    with tab_mural:
        st.markdown("##### Mensagem para os Vendedores")
        try:
            curr_msg = conn.execute("SELECT mensagem FROM avisos WHERE ativo=1 ORDER BY id DESC LIMIT 1").fetchone()
            val_msg = curr_msg[0] if curr_msg else ""
        except: val_msg = ""
        new_msg = st.text_area("Digite o aviso aqui:", value=val_msg, height=100)
        if st.button("📢 PUBLICAR AVISO"):
            conn.execute("UPDATE avisos SET ativo=0"); conn.execute("INSERT INTO avisos (mensagem, ativo) VALUES (?, 1)", (new_msg,)); conn.commit(); st.success("Aviso atualizado!")
    with tab_doc:
        st.markdown("##### Personalizar Contrato/Recibo")
        c_text, c_prev = st.columns(2)
        with c_text:
            try:
                res = conn.execute("SELECT modelo_contrato FROM config").fetchone()
                curr_text = res[0] if res else "Texto Padrão..."
            except: curr_text = "Texto Padrão..."
            new_text = st.text_area("Edite o texto:", value=curr_text, height=400)
            if st.button("💾 SALVAR TEXTO"):
                if not res: conn.execute("INSERT INTO config (modelo_contrato) VALUES (?)", (new_text,))
                else: conn.execute("UPDATE config SET modelo_contrato=?", (new_text,))
                conn.commit(); st.success("Texto salvo!")
            st.divider()
            up_logo = st.file_uploader("Trocar Logo (PNG/JPG)", type=['png','jpg'])
            if up_logo: 
                with open("logo.png","wb") as f: f.write(up_logo.getbuffer())
                conn.execute("UPDATE config SET logo_path='logo.png'"); conn.commit(); st.success("Logo atualizada!")
        with c_prev:
            st.caption("Visualização em Tempo Real (Dados Fictícios)")
            mock = {'c':'CLIENTE TESTE', 'v':1500.0, 'p':'PRODUTO X', 'vp':150.0, 'pa':10, 'frete':50.0, 'e':'EMPRESA Y', 'cpf':'000.000.000-00', 'm':'12345'}
            pdf_prev = gerar_pdf(mock, "recibo") 
            b64_prev = base64.b64encode(pdf_prev).decode('latin-1')
            st.markdown(f'<iframe src="data:application/pdf;base64,{b64_prev}" width="100%" height="600"></iframe>', unsafe_allow_html=True)

elif menu == "Minhas Comissões":
    st.info("Extrato disponível.")
