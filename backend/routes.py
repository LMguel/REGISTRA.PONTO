from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import uuid
import tempfile
import os
import boto3
from aws_utils import (
    tabela_funcionarios, tabela_registros, enviar_s3, reconhecer_funcionario, rekognition, BUCKET, COLLECTION, REGIAO, tabela_usuarioempresa
)
from functools import wraps
from auth import verify_token
from werkzeug.security import check_password_hash
import jwt
from flask import current_app

s3 = boto3.client('s3', region_name=REGIAO)

routes = Blueprint('routes', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # O token pode vir no header Authorization: Bearer <token>
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Token ausente'}), 401
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token inválido'}), 401
        return f(payload, *args, **kwargs)
    return decorated

@routes.route('/')
def health():
    return 'OK', 200

@routes.route('/registros/<registro_id>', methods=['DELETE'])
def deletar_registro(registro_id):
    try:
        # Buscar o registro pelo registro_id (scan, pois não é chave primária)
        response = tabela_registros.scan(
            FilterExpression='registro_id = :rid',
            ExpressionAttributeValues={':rid': registro_id}
        )
        items = response.get('Items', [])
        if not items:
            return jsonify({'error': 'Registro não encontrado'}), 404
        registro = items[0]
        # Deletar usando a chave composta correta
        tabela_registros.delete_item(Key={
            'funcionario_id': registro['funcionario_id'],
            'data_hora': registro['data_hora']
        })
        return jsonify({'message': 'Registro deletado com sucesso!'}), 200
    except Exception as e:
        print(f"Erro ao deletar registro: {str(e)}")
        return jsonify({'error': 'Erro ao deletar registro'}), 500

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

        # Alternar tipo do registro
        tipo = 'entrada' if not registros_do_dia or registros_do_dia[-1]['tipo'] == 'saída' else 'saída'

        # Registrar no DynamoDB com empresa_id e empresa_nome
        registro = {
            'registro_id': str(uuid.uuid4()),
            'funcionario_id': funcionario_id,
            'data_hora': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'tipo': tipo,
            'empresa_id': funcionario.get('empresa_id'),
            'empresa_nome': funcionario.get('empresa_nome')
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

@routes.route('/funcionarios', methods=['GET'])
@token_required
def listar_funcionarios(payload):
    try:
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.scan(
            FilterExpression='empresa_id = :empresa_id',
            ExpressionAttributeValues={':empresa_id': empresa_id}
        )
        return jsonify(response['Items'])
    except Exception as e:
        print(f"Erro no backend: {str(e)}")
        return jsonify({'error': 'Erro interno no servidor'}), 500

@routes.route('/funcionarios/<funcionario_id>', methods=['GET'])
def obter_funcionario(funcionario_id):
    try:
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        if 'Item' not in response:
            return jsonify({'error': 'Funcionário não encontrado'}), 404
        return jsonify(response['Item'])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes.route('/funcionarios/<funcionario_id>', methods=['PUT'])
def atualizar_funcionario(funcionario_id):
    try:
        # Validação de empresa_id
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Token ausente'}), 401
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token inválido'}), 401
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')
        if not funcionario:
            return jsonify({'error': 'Funcionário não encontrado'}), 404
        if funcionario.get('empresa_id') != empresa_id:
            return jsonify({'error': 'Acesso negado'}), 403
        nome = request.form.get('nome')
        cargo = request.form.get('cargo')
        if not nome or not cargo:
            return jsonify({'error': 'Nome e cargo são obrigatórios'}), 400
        if 'foto' in request.files:
            foto = request.files['foto']
            temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
            foto.save(temp_path)
            s3.upload_file(
                temp_path,
                BUCKET,
                f"funcionarios/{funcionario_id}.jpg",
                ExtraArgs={'ContentType': 'image/jpeg'}
            )
            foto_url = f"https://{BUCKET}.s3.{REGIAO}.amazonaws.com/funcionarios/{funcionario_id}.jpg"
            if 'face_id' in funcionario:
                rekognition.delete_faces(
                    CollectionId=COLLECTION,
                    FaceIds=[funcionario['face_id']]
                )
            with open(temp_path, 'rb') as image:
                rekognition_response = rekognition.index_faces(
                    CollectionId=COLLECTION,
                    Image={'Bytes': image.read()},
                    ExternalImageId=funcionario_id,
                    MaxFaces=1,
                    QualityFilter="AUTO",
                    DetectionAttributes=["ALL"]
                )
            face_id = rekognition_response['FaceRecords'][0]['Face']['FaceId']
            os.remove(temp_path)
            funcionario['foto_url'] = foto_url
            funcionario['face_id'] = face_id
        funcionario['nome'] = nome
        funcionario['cargo'] = cargo
        tabela_funcionarios.put_item(Item=funcionario)
        return jsonify({'message': 'Funcionário atualizado com sucesso!'}), 200
    except Exception as e:
        print(f"Erro ao atualizar funcionário: {str(e)}")
        return jsonify({'error': 'Erro ao atualizar funcionário'}), 500

@routes.route('/funcionarios/<funcionario_id>/foto', methods=['PUT'])
def atualizar_foto_funcionario(funcionario_id):
    if 'foto' not in request.files:
        return jsonify({"error": "Nenhuma foto enviada"}), 400
    foto = request.files['foto']
    temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
    foto.save(temp_path)
    try:
        response = rekognition.list_faces(CollectionId=COLLECTION)
        for face in response['Faces']:
            if face['ExternalImageId'] == funcionario_id:
                rekognition.delete_faces(
                    CollectionId=COLLECTION,
                    FaceIds=[face['FaceId']]
                )
                break
        foto_nome = f"{funcionario_id}.jpg"
        foto_url = enviar_s3(temp_path, foto_nome)
        rekognition.index_faces(
            CollectionId=COLLECTION,
            Image={'S3Object': {'Bucket': BUCKET, 'Name': foto_nome}},
            ExternalImageId=funcionario_id
        )
        tabela_funcionarios.update_item(
            Key={'id': funcionario_id},
            UpdateExpression='SET foto_url = :url',
            ExpressionAttributeValues={':url': foto_url}
        )
        return jsonify({"success": True, "foto_url": foto_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        os.remove(temp_path)

@routes.route('/funcionarios/<funcionario_id>', methods=['DELETE'])
def excluir_funcionario(funcionario_id):
    try:
        # Validação de empresa_id
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Token ausente'}), 401
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token inválido'}), 401
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')
        if not funcionario:
            return jsonify({'error': 'Funcionário não encontrado'}), 404
        if funcionario.get('empresa_id') != empresa_id:
            return jsonify({'error': 'Acesso negado'}), 403
        try:
            rekognition_response = rekognition.list_faces(CollectionId=COLLECTION)
            for face in rekognition_response['Faces']:
                if face['ExternalImageId'] == funcionario_id:
                    rekognition.delete_faces(
                        CollectionId=COLLECTION,
                        FaceIds=[face['FaceId']]
                    )
                    break
        except Exception as e:
            print(f"Erro ao excluir face no Rekognition: {str(e)}")
        tabela_funcionarios.delete_item(Key={'id': funcionario_id})
        return jsonify({'message': 'Funcionário excluído com sucesso'}), 200
    except Exception as e:
        print(f"Erro ao excluir funcionário: {str(e)}")
        return jsonify({'error': 'Erro ao excluir funcionário'}), 500

@routes.route('/cadastrar_funcionario', methods=['POST'])
@token_required
def cadastrar_funcionario(payload):
    try:
        nome = request.form.get('nome')
        cargo = request.form.get('cargo')
        foto = request.files.get('foto')
        if not all([nome, cargo, foto]):
            return jsonify({"error": "Nome, cargo e foto são obrigatórios"}), 400
        funcionario_id = f"{nome.lower().replace(' ', '_')}_{uuid.uuid4().hex[:6]}"
        foto_nome = f"funcionarios/{funcionario_id}.jpg"
        temp_path = os.path.join(tempfile.gettempdir(), foto_nome.split('/')[-1])
        foto.save(temp_path)
        foto_url = enviar_s3(temp_path, foto_nome)
        with open(temp_path, 'rb') as image:
            rekognition_response = rekognition.index_faces(
                CollectionId=COLLECTION,
                Image={'Bytes': image.read()},
                ExternalImageId=funcionario_id,
                MaxFaces=1,
                QualityFilter="AUTO",
                DetectionAttributes=["DEFAULT"]
            )
        if not rekognition_response['FaceRecords']:
            os.remove(temp_path)
            return jsonify({"error": "Nenhum rosto detectado na imagem."}), 400
        face_id = rekognition_response['FaceRecords'][0]['Face']['FaceId']
        empresa_nome = payload.get('empresa_nome')
        empresa_id = payload.get('empresa_id')
        tabela_funcionarios.put_item(Item={
            'id': funcionario_id,
            'nome': nome,
            'cargo': cargo,
            'foto_url': foto_url,
            'face_id': face_id,
            'empresa_nome': empresa_nome,
            'empresa_id': empresa_id,
            'data_cadastro': datetime.now().strftime('%Y-%m-%d')
        })
        os.remove(temp_path)
        return jsonify({
            "success": True,
            "id": funcionario_id,
            "nome": nome,
            "cargo": cargo,
            "foto_url": foto_url
        }), 201
    except Exception as e:
        print(f"Erro ao cadastrar funcionário: {str(e)}")
        return jsonify({"error": str(e)}), 500

@routes.route('/registros', methods=['GET'])
@token_required
def listar_registros(payload):
    data_inicio = request.args.get('inicio')
    data_fim = request.args.get('fim')
    nome_funcionario = request.args.get('nome')
    funcionario_id = request.args.get('funcionario_id')
    try:
        empresa_id = payload.get('empresa_id')
        funcionarios_filtrados = []
        # Buscar apenas funcionários da empresa
        filtro_func = {
            'FilterExpression': 'empresa_id = :empresa_id',
            'ExpressionAttributeValues': {':empresa_id': empresa_id}
        }
        if nome_funcionario:
            filtro_func['FilterExpression'] += ' AND contains(nome, :nome)'
            filtro_func['ExpressionAttributeValues'][':nome'] = nome_funcionario
        response_func = tabela_funcionarios.scan(**filtro_func)
        funcionarios_filtrados = [f['id'] for f in response_func['Items']]
        if funcionario_id:
            # Só permite se o funcionário for da empresa
            if funcionario_id in funcionarios_filtrados:
                funcionarios_filtrados = [funcionario_id]
            else:
                funcionarios_filtrados = []
        filtro = {}
        expression_attributes = {}
        conditions = []
        # Sempre filtra por empresa
        conditions.append('empresa_id = :empresa_id')
        expression_attributes[':empresa_id'] = empresa_id
        if data_inicio and data_fim:
            conditions.append('data_hora BETWEEN :inicio AND :fim')
            expression_attributes[':inicio'] = f"{data_inicio} 00:00:00"
            expression_attributes[':fim'] = f"{data_fim} 23:59:59"
        if funcionarios_filtrados:
            conditions.append('funcionario_id IN ({})'.format(
                ', '.join([f':id_{i}' for i in range(len(funcionarios_filtrados))])
            ))
            for i, func_id in enumerate(funcionarios_filtrados):
                expression_attributes[f':id_{i}'] = func_id
        if conditions:
            filtro['FilterExpression'] = ' AND '.join(conditions)
            filtro['ExpressionAttributeValues'] = expression_attributes
        response = tabela_registros.scan(**filtro)
        registros = response['Items']
        # Formatar data para DD-MM-AAAA
        for reg in registros:
            if 'data_hora' in reg:
                data_part, hora_part = reg['data_hora'].split(' ')
                yyyy, mm, dd = data_part.split('-')
                reg['data_hora'] = f"{dd}-{mm}-{yyyy} {hora_part}"
        if funcionario_id:
            funcionario = tabela_funcionarios.get_item(Key={'id': funcionario_id})
            funcionario_nome = funcionario['Item']['nome'] if 'Item' in funcionario else 'Desconhecido'
            for registro in registros:
                registro['funcionario_nome'] = funcionario_nome
            return jsonify(registros)
        horas_trabalhadas_por_funcionario = {}
        for registro in registros:
            funcionario_id = registro['funcionario_id']
            if funcionario_id not in horas_trabalhadas_por_funcionario:
                horas_trabalhadas_por_funcionario[funcionario_id] = {
                    'nome': '',
                    'horas_trabalhadas': timedelta()
                }
            if registro['tipo'] == 'entrada':
                try:
                    horas_trabalhadas_por_funcionario[funcionario_id]['ultima_entrada'] = datetime.strptime(
                        registro['data_hora'], '%d-%m-%Y %H:%M:%S'
                    )
                except ValueError:
                    horas_trabalhadas_por_funcionario[funcionario_id]['ultima_entrada'] = datetime.strptime(
                        registro['data_hora'], '%d-%m-%Y %H:%M'
                    )
            elif registro['tipo'] == 'saída' and 'ultima_entrada' in horas_trabalhadas_por_funcionario[funcionario_id]:
                try:
                    saida = datetime.strptime(registro['data_hora'], '%d-%m-%Y %H:%M:%S')
                except ValueError:
                    saida = datetime.strptime(registro['data_hora'], '%d-%m-%Y %H:%M')
                entrada = horas_trabalhadas_por_funcionario[funcionario_id].pop('ultima_entrada')
                horas_trabalhadas_por_funcionario[funcionario_id]['horas_trabalhadas'] += saida - entrada
        for funcionario_id, dados in horas_trabalhadas_por_funcionario.items():
            funcionario = tabela_funcionarios.get_item(Key={'id': funcionario_id})
            dados['nome'] = funcionario['Item']['nome'] if 'Item' in funcionario else 'Desconhecido'
        resultado = [
            {
                'funcionario': dados['nome'],
                'funcionario_id': funcionario_id,
                'horas_trabalhadas': str(dados['horas_trabalhadas'])
            }
            for funcionario_id, dados in horas_trabalhadas_por_funcionario.items()
        ]
        return jsonify(resultado)
    except Exception as e:
        print(f"Erro ao filtrar registros: {str(e)}")
        return jsonify({'error': 'Erro ao filtrar registros'}), 500

@routes.route('/funcionarios/nome', methods=['GET'])
@token_required
def buscar_nomes(payload):
    nome_parcial = request.args.get('nome', '')
    try:
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.scan(
            FilterExpression='empresa_id = :empresa_id AND contains(nome, :nome)',
            ExpressionAttributeValues={':empresa_id': empresa_id, ':nome': nome_parcial}
        )
        nomes = [funcionario['nome'] for funcionario in response['Items']]
        return jsonify(nomes)
    except Exception as e:
        print(f"Erro ao buscar nomes: {str(e)}")
        return jsonify({'error': 'Erro ao buscar nomes'}), 500

@routes.route('/enviar-email-registros', methods=['POST'])
def enviar_email_registros():
    try:
        from io import BytesIO
        from openpyxl import Workbook
        data = request.json
        funcionario = data.get('funcionario', 'Funcionário não especificado')
        periodo = data.get('periodo', 'Período não especificado')
        registros = data.get('registros', [])
        email_destino = data.get('email')
        if not email_destino:
            return jsonify({'error': 'Email não fornecido'}), 400
        output = BytesIO()
        workbook = Workbook()
        sheet_resumo = workbook.active
        sheet_resumo.title = "Resumo"
        sheet_resumo.append(["Relatório de Registros de Ponto"])
        sheet_resumo.append(["Funcionário:", funcionario])
        sheet_resumo.append(["Período:", periodo])
        sheet_resumo.append([])
        sheet_resumo.append(["Total de Registros:", len(registros)])
        sheet_detalhes = workbook.create_sheet("Registros")
        sheet_detalhes.append(["Data", "Hora", "Tipo"])
        for registro in registros:
            data_hora = registro.get('data_hora', '').split(' ')
            sheet_detalhes.append([
                data_hora[0] if len(data_hora) > 0 else '',
                data_hora[1] if len(data_hora) > 1 else '',
                registro.get('tipo', '')
            ])
        workbook.save(output)
        output.seek(0)
        print(f"Simulando envio para {email_destino}")
        print(f"Relatório de {funcionario} ({periodo}) com {len(registros)} registros")
        return jsonify({
            'success': True,
            'message': f'Relatório enviado para {email_destino}'
        })
    except Exception as e:
        print(f"Erro ao enviar email: {str(e)}")
        return jsonify({'error': str(e)}), 500

@routes.route('/registrar_ponto_manual', methods=['POST'])
@token_required
def registrar_ponto_manual(payload):
    data = request.get_json()
    funcionario_id = data.get('funcionario_id')
    data_hora = data.get('data_hora')  # Formato: 'YYYY-MM-DD HH:MM'
    tipo = data.get('tipo')
    if not funcionario_id or not data_hora or not tipo:
        return jsonify({'mensagem': 'Funcionário, data/hora e tipo são obrigatórios'}), 400
    # Verifica se o funcionário existe e se pertence à empresa do usuário
    empresa_nome = payload.get('empresa_nome')
    empresa_id = payload.get('empresa_id')
    response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
    funcionario = response.get('Item')
    if not funcionario or funcionario.get('empresa_nome') != empresa_nome or funcionario.get('empresa_id') != empresa_id:
        return jsonify({'mensagem': 'Funcionário não encontrado'}), 404
    id_registro = str(uuid.uuid4())
    # Salva no DynamoDB
    tabela_registros.put_item(
        Item={
            'registro_id': id_registro,
            'funcionario_id': funcionario_id,
            'data_hora': data_hora,
            'tipo': tipo,
            'empresa_nome': empresa_nome,
            'empresa_id': empresa_id
        }
    )
    return jsonify({'mensagem': f'Ponto manual registrado como {tipo} com sucesso'}), 200

@routes.route('/registros_protegido', methods=['GET'])
@token_required
def listar_registros_protegido(payload):
    company_id = payload.get("company_id")
    # Exemplo de implementação simples para buscar registros por company_id
    response = tabela_registros.scan(
        FilterExpression='company_id = :cid',
        ExpressionAttributeValues={':cid': company_id}
    )
    registros = response.get('Items', [])
    return jsonify(registros)

@routes.route('/login', methods=['POST'])
def login():
    from auth import verify_password
    import datetime
    import jwt
    from flask import current_app
    data = request.json
    usuario_id = data.get('usuario_id')
    senha = data.get('senha')

    # Buscar o usuário na tabela UsuarioEmpresa pelo usuario_id
    response = tabela_usuarioempresa.get_item(Key={'usuario_id': usuario_id})
    usuario = response.get('Item')

    if not usuario or not verify_password(senha, usuario['senha_hash']):
        return jsonify({'error': 'Credenciais inválidas'}), 401

    # Gerar token com info da empresa, incluindo empresa_id
    token = jwt.encode({
        'usuario_id': usuario['usuario_id'],
        'empresa_nome': usuario['empresa_nome'],
        'empresa_id': usuario.get('empresa_id'),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=12)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({'token': token})

@routes.route('/cadastrar_usuario_empresa', methods=['POST'])
def cadastrar_usuario_empresa():
    from auth import hash_password
    import re
    data = request.json
    usuario_id = data.get('usuario_id')
    email = data.get('email')
    empresa_nome = data.get('empresa_nome')
    senha = data.get('senha')
    if not all([usuario_id, email, empresa_nome, senha]):
        return jsonify({'error': 'Campos obrigatórios ausentes'}), 400
    # Validação de formato de email
    email_regex = r'^[\w\.-]+@[\w\.-]+\.\w{2,}$'
    if not re.match(email_regex, email):
        return jsonify({'error': 'Email inválido'}), 400
    # Verifica se usuario_id já existe
    response = tabela_usuarioempresa.get_item(Key={'usuario_id': usuario_id})
    if 'Item' in response:
        return jsonify({'error': 'Usuário já existe com esse usuario_id'}), 400
    senha_hash = hash_password(senha)
    from datetime import datetime
    empresa_id = str(uuid.uuid4())
    tabela_usuarioempresa.put_item(Item={
        'usuario_id': usuario_id,
        'email': email,
        'empresa_nome': empresa_nome,
        'empresa_id': empresa_id,
        'senha_hash': senha_hash,
        'data_criacao': datetime.now().isoformat()
    })
    return jsonify({'success': True, 'usuario_id': usuario_id, 'empresa_id': empresa_id}), 201
def cadastrar_usuario_empresa():
    from auth import hash_password
    data = request.json
    usuario_id = data.get('usuario_id')
    email = data.get('email')
    empresa_nome = data.get('empresa_nome')
    senha = data.get('senha')
    if not all([usuario_id, email, empresa_nome, senha]):
        return jsonify({'error': 'Campos obrigatórios ausentes'}), 400
    senha_hash = hash_password(senha)
    from datetime import datetime
    tabela_usuarioempresa.put_item(Item={
        'usuario_id': usuario_id,
        'email': email,
        'empresa_nome': empresa_nome,
        'senha_hash': senha_hash,
        'data_criacao': datetime.now().isoformat()
    })
    return jsonify({'success': True, 'usuario_id': usuario_id})

