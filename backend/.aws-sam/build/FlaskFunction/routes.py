from flask import Blueprint, request, jsonify
from flask_cors import CORS, cross_origin
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
from boto3.dynamodb.conditions import Attr

s3 = boto3.client('s3', region_name=REGIAO)

routes = Blueprint('routes', __name__)

# Enable CORS for all routes in this blueprint
CORS(routes, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "https://localhost:3000"],  # Add your frontend URLs
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

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

@routes.route('/', methods=['GET', 'OPTIONS'])
@cross_origin()
def health():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    return 'OK', 200

@routes.route('/registros/<registro_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
def deletar_registro(registro_id):
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
        return response
        
    try:
        # Buscar o registro pelo registro_id (scan, pois não é chave primária)
        response = tabela_registros.scan(
            FilterExpression=Attr('registro_id').eq(registro_id)
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

@routes.route('/registrar_ponto', methods=['POST', 'OPTIONS'])
@cross_origin()
def registrar_ponto():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
        
    try:
        if 'foto' not in request.files:
            return jsonify({
                'success': False,
                'message': 'Nenhuma foto enviada'
            }), 400

        foto = request.files['foto']
        temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
        foto.save(temp_path)

        print("[DEBUG] Tentando reconhecer funcionário...")
        funcionario_id = reconhecer_funcionario(temp_path)
        os.remove(temp_path)
        print(f"[DEBUG] Resultado reconhecimento: {funcionario_id if funcionario_id else 'Não reconhecido'}")

        if not funcionario_id:
            return jsonify({
                'success': False,
                'message': 'Funcionário não reconhecido'
            }), 404

        # Buscar dados do funcionário
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')

        if not funcionario:
            return jsonify({
                'success': False,
                'message': 'Funcionário não encontrado'
            }), 404

        funcionario_nome = funcionario['nome']
        agora = datetime.now()
        hoje = agora.strftime('%Y-%m-%d')
        
        response_registros = tabela_registros.scan(
            FilterExpression=Attr('funcionario_id').eq(funcionario_id) & Attr('data_hora').begins_with(hoje)
        )
        registros_do_dia = sorted(response_registros['Items'], key=lambda x: x['data_hora'])

        tipo = 'entrada' if not registros_do_dia or registros_do_dia[-1]['tipo'] == 'saída' else 'saída'

        registro = {
            'registro_id': str(uuid.uuid4()),
            'funcionario_id': funcionario_id,
            'data_hora': agora.strftime('%Y-%m-%d %H:%M:%S'),
            'tipo': tipo,
            'empresa_id': funcionario.get('empresa_id'),
            'empresa_nome': funcionario.get('empresa_nome')
        }
        tabela_registros.put_item(Item=registro)

        return jsonify({
            'success': True,
            'funcionario': funcionario_nome,
            'hora': registro['data_hora'],
            'tipo': tipo
        })

    except Exception as e:
        print(f"Erro no registro de ponto: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Erro interno no servidor'
        }), 500

@routes.route('/funcionarios', methods=['GET'])
@token_required  
def listar_funcionarios(payload):
    try:
        print('=== DEBUG FUNCIONARIOS ===')
        empresa_id = payload.get('empresa_id')
        print(f'empresa_id: {empresa_id}')
        
        # TESTE 1: Scan sem filtro (retorna TODOS os funcionários)
        try:
            print('Tentando scan sem filtro...')
            response = tabela_funcionarios.scan()
            all_items = response.get('Items', [])
            print(f'Total de funcionários na tabela: {len(all_items)}')
            
            # Log dos primeiros itens para debug
            for i, item in enumerate(all_items[:3]):
                print(f'Item {i}: {item}')
            
            # TESTE 2: Filtrar manualmente em Python (não no DynamoDB)
            empresa_funcionarios = []
            for item in all_items:
                item_empresa_id = item.get('empresa_id')
                print(f'Comparando: "{item_empresa_id}" == "{empresa_id}"')
                if item_empresa_id == empresa_id:
                    empresa_funcionarios.append(item)
                    
            print(f'Funcionários filtrados para empresa {empresa_id}: {len(empresa_funcionarios)}')
            
            return jsonify({
                'success': True,
                'total_funcionarios': len(all_items),
                'funcionarios_empresa': len(empresa_funcionarios),
                'funcionarios': empresa_funcionarios
            })
            
        except Exception as e:
            print(f'ERRO no scan: {str(e)}')
            return jsonify({'error': f'Erro no DynamoDB: {str(e)}'}), 500
            
    except Exception as e:
        print(f'Erro geral: {str(e)}')
        return jsonify({'error': str(e)}), 500

@routes.route('/funcionarios/<funcionario_id>', methods=['GET'])
@token_required
def obter_funcionario(payload, funcionario_id):
    try:
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')
        if not funcionario or funcionario.get('empresa_id') != empresa_id:
            return jsonify({'error': 'Funcionário não encontrado'}), 404
        return jsonify(funcionario)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@routes.route('/funcionarios/<funcionario_id>', methods=['PUT'])
@token_required
def atualizar_funcionario(payload, funcionario_id):
    try:
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')
        if not funcionario or funcionario.get('empresa_id') != empresa_id:
            return jsonify({'error': 'Funcionário não encontrado'}), 404
        
        # Corrigir: ler nome/cargo de request.form (FormData)
        nome = request.form.get('nome')
        cargo = request.form.get('cargo')
        if not nome or not cargo:
            return jsonify({'error': 'Nome e cargo são obrigatórios'}), 400
            
        # Atualizar foto se fornecida
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
@token_required
def atualizar_foto_funcionario(payload, funcionario_id):
    if 'foto' not in request.files:
        return jsonify({"error": "Nenhuma foto enviada"}), 400
    foto = request.files['foto']
    temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
    foto.save(temp_path)
    try:
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')
        if not funcionario or funcionario.get('empresa_id') != empresa_id:
            return jsonify({'error': 'Funcionário não encontrado'}), 404
        response_faces = rekognition.list_faces(CollectionId=COLLECTION)
        for face in response_faces['Faces']:
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
        print("[EDIT FUNC] Início da atualização de funcionário", funcionario_id)
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')
        print("[EDIT FUNC] funcionario encontrado:", funcionario)
        if not funcionario or funcionario.get('empresa_id') != empresa_id:
            print("[EDIT FUNC] Funcionário não encontrado ou não pertence à empresa")
            return jsonify({'error': 'Funcionário não encontrado'}), 404

        nome = request.form.get('nome')
        cargo = request.form.get('cargo')
        print(f"[EDIT FUNC] nome: {nome}, cargo: {cargo}")
        if not nome or not cargo:
            print("[EDIT FUNC] Nome ou cargo ausente")
            return jsonify({'error': 'Nome e cargo são obrigatórios'}), 400

        # Atualizar foto se fornecida
        if 'foto' in request.files:
            foto = request.files['foto']
            print("[EDIT FUNC] Foto recebida:", foto.filename, foto.content_type)
            temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
            foto.save(temp_path)
            print("[EDIT FUNC] Foto salva em:", temp_path)
            s3.upload_file(
                temp_path,
                BUCKET,
                f"funcionarios/{funcionario_id}.jpg",
                ExtraArgs={'ContentType': 'image/jpeg'}
            )
            foto_url = f"https://{BUCKET}.s3.{REGIAO}.amazonaws.com/funcionarios/{funcionario_id}.jpg"
            print("[EDIT FUNC] Foto URL:", foto_url)
            try:
                if 'face_id' in funcionario:
                    print("[EDIT FUNC] Deletando face antiga do Rekognition")
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
                    print("[EDIT FUNC] Rekognition response:", rekognition_response)
                    if not rekognition_response['FaceRecords']:
                        print("[EDIT FUNC] Nenhum rosto detectado na nova foto!")
                        os.remove(temp_path)
                        return jsonify({'error': 'Nenhum rosto detectado na nova foto.'}), 400
                    face_id = rekognition_response['FaceRecords'][0]['Face']['FaceId']
                    funcionario['face_id'] = face_id
            except Exception as e:
                print(f"[EDIT FUNC] Erro ao processar foto: {e}")
                os.remove(temp_path)
                return jsonify({'error': f'Erro ao processar foto: {e}'}), 500
            os.remove(temp_path)
            funcionario['foto_url'] = foto_url

        funcionario['nome'] = nome
        funcionario['cargo'] = cargo
        print("[EDIT FUNC] Salvando funcionário atualizado:", funcionario)
        tabela_funcionarios.put_item(Item=funcionario)
        print("[EDIT FUNC] Atualização concluída com sucesso!")
        return jsonify({'message': 'Funcionário atualizado com sucesso!'}), 200
        return jsonify({"error": "Nome, cargo e foto são obrigatórios"}), 400
        funcionario_id = f"{nome.lower().replace(' ', '_')}_{uuid.uuid4().hex[:6]}"
        foto_nome = f"funcionarios/{funcionario_id}.jpg"
        temp_path = os.path.join(tempfile.gettempdir(), foto_nome.split('/')[-1])
        foto.save(temp_path)
        print("📌 Foto salva em:", temp_path)
        foto_url = enviar_s3(temp_path, foto_nome)
        print("📌 Foto URL:", foto_url)
        with open(temp_path, 'rb') as image:
            img_bytes = image.read()
            print("📌 Tamanho da imagem em bytes:", len(img_bytes))
            rekognition_response = rekognition.index_faces(
                CollectionId=COLLECTION,
                Image={'Bytes': img_bytes},
                ExternalImageId=funcionario_id,
                MaxFaces=1,
                QualityFilter="AUTO",
                DetectionAttributes=["DEFAULT"]
            )
        print("📌 Rekognition response:", rekognition_response)
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
        print(f"[DEBUG] empresa_id: {empresa_id}")
        
        if not empresa_id:
            return jsonify({'error': 'Empresa ID não encontrado no token'}), 400
        
        funcionarios_filtrados = []
        
        # Buscar apenas funcionários da empresa
        try:
            filtro_func = Attr('empresa_id').eq(empresa_id)
            if nome_funcionario:
                filtro_func = filtro_func & Attr('nome').contains(nome_funcionario)
            
            response_func = tabela_funcionarios.scan(FilterExpression=filtro_func)
            funcionarios_filtrados = [f['id'] for f in response_func.get('Items', [])]
            print(f"[DEBUG] funcionarios_filtrados: {funcionarios_filtrados}")
            
        except Exception as e:
            print(f"[DEBUG] Erro ao buscar funcionários: {str(e)}")
            return jsonify({'error': 'Erro ao buscar funcionários da empresa'}), 500
        
        if funcionario_id:
            # Só permite se o funcionário for da empresa
            if funcionario_id in funcionarios_filtrados:
                funcionarios_filtrados = [funcionario_id]
            else:
                funcionarios_filtrados = []
        
        # Se não houver funcionários na empresa, retornar vazio
        if not funcionarios_filtrados:
            print("[DEBUG] Nenhum funcionário encontrado na empresa")
            return jsonify([])
        
        # Construir filtro de registros de forma mais segura
        try:
            filtro_registros = Attr('empresa_id').eq(empresa_id)
            
            # Adicionar filtro de data se fornecido
            if data_inicio and data_fim:
                filtro_registros = filtro_registros & Attr('data_hora').between(
                    f"{data_inicio} 00:00:00", 
                    f"{data_fim} 23:59:59"
                )
            
            # Adicionar filtro de funcionários de forma segura
            if funcionarios_filtrados:
                # Usar apenas funcionários que realmente existem
                funcionarios_validos = [fid for fid in funcionarios_filtrados if fid]
                if funcionarios_validos:
                    filtro_registros = filtro_registros & Attr('funcionario_id').is_in(funcionarios_validos)
                else:
                    return jsonify([])
            
            print(f"[DEBUG] Executando scan com filtro...")
            response = tabela_registros.scan(FilterExpression=filtro_registros)
            registros = response.get('Items', [])
            print(f"[DEBUG] Encontrados {len(registros)} registros")
            
        except Exception as e:
            print(f"[DEBUG] Erro no scan de registros: {str(e)}")
            return jsonify({'error': f'Erro ao buscar registros: {str(e)}'}), 500
        
        # Formatar data para DD-MM-AAAA
        for reg in registros:
            if 'data_hora' in reg:
                try:
                    data_part, hora_part = reg['data_hora'].split(' ')
                    yyyy, mm, dd = data_part.split('-')
                    reg['data_hora'] = f"{dd}-{mm}-{yyyy} {hora_part}"
                except (ValueError, IndexError) as e:
                    print(f"[DEBUG] Erro ao formatar data {reg.get('data_hora', 'N/A')}: {str(e)}")
        
        # Se solicitou funcionário específico, retornar registros com nome
        if funcionario_id:
            try:
                funcionario = tabela_funcionarios.get_item(Key={'id': funcionario_id})
                funcionario_nome = funcionario.get('Item', {}).get('nome', 'Desconhecido')
                for registro in registros:
                    registro['funcionario_nome'] = funcionario_nome
                return jsonify(registros)
            except Exception as e:
                print(f"[DEBUG] Erro ao buscar nome do funcionário: {str(e)}")
                return jsonify(registros)  # Retornar sem nome em caso de erro
        
        # Calcular horas trabalhadas por funcionário
        try:
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
                        try:
                            horas_trabalhadas_por_funcionario[funcionario_id]['ultima_entrada'] = datetime.strptime(
                                registro['data_hora'], '%d-%m-%Y %H:%M'
                            )
                        except ValueError as e:
                            print(f"[DEBUG] Erro ao parsear entrada: {registro['data_hora']}: {str(e)}")
                
                elif registro['tipo'] == 'saída' and 'ultima_entrada' in horas_trabalhadas_por_funcionario[funcionario_id]:
                    try:
                        try:
                            saida = datetime.strptime(registro['data_hora'], '%d-%m-%Y %H:%M:%S')
                        except ValueError:
                            saida = datetime.strptime(registro['data_hora'], '%d-%m-%Y %H:%M')
                        
                        entrada = horas_trabalhadas_por_funcionario[funcionario_id].pop('ultima_entrada')
                        horas_trabalhadas_por_funcionario[funcionario_id]['horas_trabalhadas'] += saida - entrada
                    except ValueError as e:
                        print(f"[DEBUG] Erro ao parsear saída: {registro['data_hora']}: {str(e)}")
            
            # Buscar nomes dos funcionários
            for funcionario_id, dados in horas_trabalhadas_por_funcionario.items():
                try:
                    funcionario = tabela_funcionarios.get_item(Key={'id': funcionario_id})
                    dados['nome'] = funcionario.get('Item', {}).get('nome', 'Desconhecido')
                except Exception as e:
                    print(f"[DEBUG] Erro ao buscar nome do funcionário {funcionario_id}: {str(e)}")
                    dados['nome'] = 'Desconhecido'
            
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
            print(f"[DEBUG] Erro ao calcular horas: {str(e)}")
            # Em caso de erro no cálculo, retornar registros simples
            return jsonify(registros)
            
    except Exception as e:
        print(f"Erro geral ao filtrar registros: {str(e)}")
        return jsonify({'error': 'Erro interno no servidor', 'message': str(e)}), 500

@routes.route('/funcionarios/nome', methods=['GET'])
@token_required
def buscar_nomes(payload):
    nome_parcial = request.args.get('nome', '')
    try:
        empresa_id = payload.get('empresa_id')
        response = tabela_funcionarios.scan(
            FilterExpression=Attr('empresa_id').eq(empresa_id) & Attr('nome').contains(nome_parcial)
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
        
        # ✅ CORREÇÃO: Usar request.get_json() em vez de request.json
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON inválido ou ausente'}), 400
            
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
    # ✅ CORREÇÃO: Usar request.get_json() em vez de request.data
    data = request.get_json()
    if not data:
        return jsonify({'mensagem': 'JSON inválido ou ausente'}), 400
        
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
        FilterExpression=Attr('company_id').eq(company_id)
    )
    registros = response.get('Items', [])
    return jsonify(registros)

@routes.route('/login', methods=['POST', 'OPTIONS'])
@cross_origin()
def login():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
        
    from auth import verify_password, get_secret_key  # Importar a nova função
    import datetime
    import jwt
    
    try:
        # ✅ CORREÇÃO: Usar request.get_json() em vez de request.json
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON inválido ou ausente'}), 400
            
        usuario_id = data.get('usuario_id')
        senha = data.get('senha')

        # Buscar o usuário na tabela UsuarioEmpresa pelo usuario_id
        response = tabela_usuarioempresa.get_item(Key={'usuario_id': usuario_id})
        usuario = response.get('Item')

        if not usuario or not verify_password(senha, usuario['senha_hash']):
            return jsonify({'error': 'Credenciais inválidas'}), 401

        # ✅ CORREÇÃO: Usar get_secret_key() para garantir string
        secret_key = get_secret_key()
        
        # Gerar token com info da empresa, incluindo empresa_id
        token = jwt.encode({
            'usuario_id': usuario['usuario_id'],
            'empresa_nome': usuario['empresa_nome'],
            'empresa_id': usuario.get('empresa_id'),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }, secret_key, algorithm="HS256")
        
        print(f"[DEBUG] Token gerado com SECRET_KEY tipo: {type(secret_key)}")
        
        response = jsonify({'token': token})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"Erro no login: {str(e)}")
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Add CORS support to the cadastrar_usuario_empresa route
@routes.route('/cadastrar_usuario_empresa', methods=['POST', 'OPTIONS'])
@cross_origin()
def cadastrar_usuario_empresa():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response
        
    from auth import hash_password
    import re
    
    try:
        # ✅ CORREÇÃO: Usar request.get_json() em vez de request.json
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON inválido ou ausente'}), 400
            
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
        empresa_id = str(uuid.uuid4())
        
        tabela_usuarioempresa.put_item(Item={
            'usuario_id': usuario_id,
            'email': email,
            'empresa_nome': empresa_nome,
            'empresa_id': empresa_id,
            'senha_hash': senha_hash,
            'data_criacao': datetime.now().isoformat()
        })
        
        response = jsonify({'success': True, 'usuario_id': usuario_id, 'empresa_id': empresa_id})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 201
        
    except Exception as e:
        print(f"Erro ao cadastrar usuário empresa: {str(e)}")
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

@routes.route('/teste', methods=['GET', 'OPTIONS'])
@cross_origin()
def teste():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
    return jsonify({'mensagem': 'Rota de teste funcionando!'}), 200