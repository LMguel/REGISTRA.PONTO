from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import uuid
import tempfile
import os
from aws_utils import (
    tabela_funcionarios, tabela_registros, enviar_s3, reconhecer_funcionario, rekognition, BUCKET, COLLECTION, REGIAO
)

routes = Blueprint('routes', __name__)

# Todas as rotas do antigo app.py devem ser movidas para cá, usando 'routes.route' ao invés de 'app.route'.
# Exemplo:

@routes.route('/registrar_ponto', methods=['POST'])
def registrar_ponto():
    try:
        if 'foto' not in request.files:
            return jsonify({"error": "Nenhuma foto enviada"}), 400

        foto = request.files['foto']
        temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
        foto.save(temp_path)

        funcionario_id = reconhecer_funcionario(temp_path)
        os.remove(temp_path)

        if not funcionario_id:
            return jsonify({"error": "Funcionário não reconhecido"}), 404

        # Buscar dados do funcionário
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')

        if not funcionario:
            return jsonify({"error": "Funcionário não encontrado no banco de dados"}), 404

        funcionario_nome = funcionario['nome']

        # Verificar registros do dia
        hoje = datetime.now().strftime('%Y-%m-%d')
        response_registros = tabela_registros.scan(
            FilterExpression='funcionario_id = :id AND begins_with(data_hora, :hoje)',
            ExpressionAttributeValues={':id': funcionario_id, ':hoje': hoje}
        )
        registros_do_dia = sorted(response_registros['Items'], key=lambda x: x['data_hora'])

        # Definir tipo do registro
        tipo = 'entrada'
        if registros_do_dia and registros_do_dia[-1]['tipo'] == 'entrada':
            tipo = 'saída'

        # Registrar no DynamoDB
        registro = {
            'registro_id': str(uuid.uuid4()),
            'funcionario_id': funcionario_id,
            'data_hora': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'tipo': tipo
        }
        tabela_registros.put_item(Item=registro)

        return jsonify({
            "success": True,
            "funcionario": funcionario_nome,
            "hora": registro['data_hora'],
            "tipo": tipo
        }), 200

    except Exception as e:
        print(f"Erro no registro de ponto: {str(e)}")
        return jsonify({"error": "Erro interno no servidor"}), 500

# Repita para todas as rotas do app original, ajustando 'app.route' para 'routes.route'.
# Importe helpers do aws_utils conforme necessário.
