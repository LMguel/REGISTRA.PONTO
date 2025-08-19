import jwt
import hashlib
from flask import current_app
import os

# Obter SECRET_KEY de forma mais robusta
def get_secret_key():
    """Obtém o SECRET_KEY de forma segura e garante que seja string"""
    
    # Tentar várias fontes para o SECRET_KEY
    secret_key = None
    
    # 1. Variável de ambiente
    secret_key = os.environ.get('SECRET_KEY')
    if secret_key:
        print(f"[DEBUG] SECRET_KEY obtido via os.environ: {type(secret_key)}")
    
    # 2. Flask app config
    if not secret_key:
        try:
            secret_key = current_app.config.get('SECRET_KEY')
            if secret_key:
                print(f"[DEBUG] SECRET_KEY obtido via Flask config: {type(secret_key)}")
        except RuntimeError:
            pass  # Fora do contexto da aplicação
    
    # 3. Stage variables (para AWS Lambda)
    if not secret_key:
        try:
            import json
            context = os.environ.get('AWS_LAMBDA_STAGE_VARIABLES')
            if context:
                stage_vars = json.loads(context)
                secret_key = stage_vars.get('SECRET_KEY')
                if secret_key:
                    print(f"[DEBUG] SECRET_KEY obtido via stage variables: {type(secret_key)}")
        except:
            pass
    
    # 4. Fallback hardcoded (para desenvolvimento)
    if not secret_key:
        secret_key = "frichimibu"  # Seu valor padrão
        print("[DEBUG] Usando SECRET_KEY hardcoded")
    
    # Garantir que é string
    if secret_key is not None:
        secret_key = str(secret_key)
        print(f"[DEBUG] SECRET_KEY final: tipo={type(secret_key)}, tamanho={len(secret_key)}")
    else:
        raise ValueError("SECRET_KEY não encontrado em nenhuma fonte")
    
    return secret_key

def verify_token(token):
    """Verifica e decodifica o token JWT"""
    try:
        print(f"[DEBUG] Verificando token: {token[:20]}...")
        
        # Obter SECRET_KEY de forma segura
        secret_key = get_secret_key()
        
        # Decodificar o token
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        print(f"[DEBUG] Token decodificado com sucesso: {payload}")
        return payload
        
    except jwt.ExpiredSignatureError:
        print("[DEBUG] Token expirado")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[DEBUG] Token inválido: {str(e)}")
        return None
    except Exception as e:
        print(f"[DEBUG] Erro geral ao verificar token: {str(e)}")
        return None

def hash_password(password):
    """Cria hash da senha usando hashlib (compatível com Lambda)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, password_hash):
    """Verifica se a senha corresponde ao hash"""
    return hash_password(password) == password_hash

# Função auxiliar para debug no Lambda
def debug_environment():
    """Função para debugar o ambiente Lambda"""
    print("=== DEBUG ENVIRONMENT ===")
    print(f"AWS_LAMBDA_STAGE_VARIABLES: {os.environ.get('AWS_LAMBDA_STAGE_VARIABLES')}")
    print(f"SECRET_KEY (env): {os.environ.get('SECRET_KEY')}")
    
    # Listar todas as variáveis de ambiente que contenham 'SECRET'
    for key, value in os.environ.items():
        if 'SECRET' in key.upper():
            print(f"{key}: {value}")
    
    print("=========================")
    return True