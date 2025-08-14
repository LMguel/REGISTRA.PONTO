from flask import Flask
from flask_cors import CORS
from routes import routes
import os
from dotenv import load_dotenv
from lambda_adapter import lambda_response

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, methods=["GET", "POST", "OPTIONS"])

# Configurações
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Registra as rotas do blueprint
app.register_blueprint(routes)

# Lambda handler para AWS
def lambda_handler(event, context):
    return lambda_response(app, event, context)

# Modo local (dev)
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)