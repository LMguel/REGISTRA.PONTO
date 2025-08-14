#!/usr/bin/env python3
"""
Script para limpar arquivos com problemas de encoding e reconstruir dependências
"""
import os
import shutil
import subprocess
import sys

def clean_problematic_files():
    """Remove arquivos que podem ter problemas de encoding"""
    print("🧹 Limpando arquivos problemáticos...")
    
    # Pastas e arquivos para remover
    to_remove = [
        '.sam',
        '.aws-sam', 
        'lambda_dependencies',
        '__pycache__',
        '.pytest_cache'
    ]
    
    for item in to_remove:
        if os.path.exists(item):
            if os.path.isdir(item):
                shutil.rmtree(item)
                print(f"✅ Removido diretório: {item}")
            else:
                os.remove(item)
                print(f"✅ Removido arquivo: {item}")

def reinstall_dependencies():
    """Reinstala dependências de forma limpa"""
    print("\n📦 Reinstalando dependências...")
    
    os.makedirs('lambda_dependencies', exist_ok=True)
    
    # Lista mínima de dependências sem problemas
    basic_deps = [
        'Flask==3.0.2',
        'Flask-Cors==4.0.0', 
        'boto3==1.34.108',
        'python-dotenv==1.0.1',
        'requests==2.31.0',
        'PyJWT==2.8.0'
    ]
    
    # Instalar dependências básicas primeiro
    for dep in basic_deps:
        cmd = [sys.executable, '-m', 'pip', 'install', dep, '-t', 'lambda_dependencies', '--upgrade', '--no-cache-dir']
        print(f"Instalando {dep}...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Erro ao instalar {dep}: {result.stderr}")
        else:
            print(f"✅ {dep} instalado")
    
    # Instalar passlib separadamente (mais problemático)
    print("Instalando passlib...")
    cmd = [sys.executable, '-m', 'pip', 'install', 'passlib==1.7.4', '-t', 'lambda_dependencies', '--no-deps', '--no-cache-dir']
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print("✅ passlib instalado")
        
        # Instalar bcrypt separadamente
        cmd = [sys.executable, '-m', 'pip', 'install', 'bcrypt', '-t', 'lambda_dependencies', '--no-cache-dir']
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ bcrypt instalado")
        else:
            print("⚠️  bcrypt falhou, mas passlib pode funcionar sem ele")
    else:
        print(f"❌ Erro ao instalar passlib: {result.stderr}")

def create_requirements_lambda():
    """Cria um requirements.txt específico para lambda"""
    requirements_content = """Flask==3.0.2
Flask-Cors==4.0.0
boto3==1.34.108
python-dotenv==1.0.1
requests==2.31.0
PyJWT==2.8.0
passlib==1.7.4"""
    
    with open('requirements_lambda.txt', 'w', encoding='utf-8') as f:
        f.write(requirements_content)
    print("✅ requirements_lambda.txt criado")

def main():
    print("🚀 Limpando e reconstruindo projeto para deploy...")
    
    clean_problematic_files()
    create_requirements_lambda()
    reinstall_dependencies()
    
    print("\n" + "="*50)
    print("✅ Limpeza concluída!")
    print("\nPróximos passos:")
    print("1. sam build")
    print("2. sam deploy")
    
    # Verificar se tudo está OK
    if os.path.exists('lambda_dependencies/flask'):
        print("\n✅ Flask encontrado")
    if os.path.exists('lambda_dependencies/boto3'):
        print("✅ Boto3 encontrado") 
    if os.path.exists('lambda_dependencies/passlib'):
        print("✅ Passlib encontrado")
    else:
        print("⚠️  Passlib não encontrado - verifique se bcrypt está disponível")

if __name__ == "__main__":
    main()