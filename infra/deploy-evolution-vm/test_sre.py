import axios
import time
import json
import sys

# Configurações do Teste (Ambiente Local da VM)
BASE_URL = "http://localhost:8080"
INSTANCE_NAME = "debug_final"

# Tenta ler a API Key do .env local se disponível
try:
    with open("deploy-evolution-vm/.env", "r") as f:
        for line in f:
            if line.startswith("AUTHENTICATION_API_KEY="):
                API_KEY = line.split("=")[1].strip()
                break
except:
    print("ERRO: Não foi possível ler o arquivo .env. Certifique-se de estar no diretório correto.")
    sys.exit(1)

HEADERS = {
    "apikey": API_KEY,
    "Content-Type": "application/json"
}

def run_test():
    print(f"--- Iniciando Teste de Estresse: {INSTANCE_NAME} ---")
    
    # 1. Criar Instância
    print(f"[1/3] Criando instância {INSTANCE_NAME}...")
    try:
        resp = axios.post(f"{BASE_URL}/instance/create", 
                         json={"instanceName": INSTANCE_NAME, "qrcode": True}, 
                         headers=HEADERS)
        print(f"Resposta Create: {resp.status_code}")
        # print(json.dumps(resp.json(), indent=2))
    except Exception as e:
        print(f"FALHA NO CREATE: {str(e)}")
        return

    # 2. Delay Técnico (Checklist SRE)
    print("[2/3] Aguardando 5 segundos para estabilização do socket...")
    time.sleep(5)

    # 3. Tentar recuperar QR Code
    print("[3/3] Recuperando QR Code via /instance/connect...")
    try:
        resp = axios.get(f"{BASE_URL}/instance/connect/{INSTANCE_NAME}", headers=HEADERS)
        data = resp.json()
        
        if resp.status_code == 200 and "base64" in data:
            print("\nSUCESSO: QR CODE GERADO EM BASE64!")
            # print(f"Preview: {data['base64'][:50]}...")
        else:
            print(f"\nFALHA: Resposta inesperada (Status {resp.status_code})")
            print(json.dumps(data, indent=2))
            
    except Exception as e:
        print(f"\nERRO CATASTRÓFICO: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print(f"Detalhes Baileys: {e.response.text}")

if __name__ == "__main__":
    run_test()
