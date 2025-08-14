#!/usr/bin/env python3
"""
Script para forçar VS Code a reconhecer as dependências
"""
import os
import shutil

def create_symbolic_links():
    """Cria links simbólicos das dependências principais no venv"""
    venv_site_packages = "venv/Lib/site-packages"
    lambda_deps = "lambda_dependencies"
    
    if not os.path.exists(venv_site_packages):
        print("❌ Pasta venv/Lib/site-packages não encontrada")
        return
    
    # Dependências importantes para linkar
    important_deps = ['flask', 'boto3', 'botocore', 'requests', 'jwt']
    
    for dep in important_deps:
        lambda_dep_path = os.path.join(lambda_deps, dep)
        venv_dep_path = os.path.join(venv_site_packages, f"{dep}_lambda")
        
        if os.path.exists(lambda_dep_path):
            # Remove se já existir
            if os.path.exists(venv_dep_path):
                if os.path.islink(venv_dep_path):
                    os.unlink(venv_dep_path)
                elif os.path.isdir(venv_dep_path):
                    shutil.rmtree(venv_dep_path)
            
            # Tenta criar link simbólico (Windows pode precisar de admin)
            try:
                os.symlink(os.path.abspath(lambda_dep_path), venv_dep_path, target_is_directory=True)
                print(f"✅ Link criado para {dep}")
            except OSError:
                # Se não conseguir criar symlink, copia
                shutil.copytree(lambda_dep_path, venv_dep_path, dirs_exist_ok=True)
                print(f"✅ Copiado {dep} para venv")

def create_pth_file():
    """Cria arquivo .pth para adicionar lambda_dependencies ao path"""
    venv_site_packages = "venv/Lib/site-packages"
    pth_file = os.path.join(venv_site_packages, "lambda_deps.pth")
    
    with open(pth_file, 'w') as f:
        f.write(os.path.abspath("lambda_dependencies"))
    
    print("✅ Arquivo .pth criado")

def main():
    print("🔧 Forçando VS Code a reconhecer dependências...")
    
    create_pth_file()
    create_symbolic_links()
    
    print("\n✅ Concluído!")
    print("Agora:")
    print("1. Feche o VS Code completamente")
    print("2. Reabra o VS Code")
    print("3. Ctrl+Shift+P → 'Python: Clear Cache and Reload Window'")

if __name__ == "__main__":
    main()