from flask import Flask, jsonify
from routes import routes
import os
from dotenv import load_dotenv
from lambda_adapter import lambda_response

load_dotenv()

app = Flask(__name__)

# Configurações
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key-for-development')

# Registra as rotas do blueprint
app.register_blueprint(routes)

# Rota de health check global (diferente da rota / do blueprint)
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK', 
        'message': 'API funcionando',
        'service': 'Ponto Inteligente API'
    }), 200

# Tratamento de erros 404
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint não encontrado'}), 404

# Tratamento de erros 500
@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Erro interno do servidor'}), 500

# Lambda handler para AWS
def lambda_handler(event, context):
    print(f"Lambda Event: {event.get('httpMethod', 'Unknown')} {event.get('path', 'Unknown')}")
    return lambda_response(app, event, context)

# Modo local (dev)
if __name__ == '__main__':
    print("Iniciando Flask em modo desenvolvimento...")
    print(f"Secret Key configurada: {'✓' if app.config.get('SECRET_KEY') else '✗'}")
    app.run(host='0.0.0.0', port=5000, debug=True)