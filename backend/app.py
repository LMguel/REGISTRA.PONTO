from flask import Flask
from flask_cors import CORS
from routes import routes
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

# Garante que o SECRET_KEY está no app.config
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

app.register_blueprint(routes)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)