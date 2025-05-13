from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import uuid
import tempfile
import os
from datetime import datetime, timedelta

# Configurações
BUCKET = "ponto-eletronico-fotos-us"
COLLECTION = "FuncionariosCollection"
TABELA_FUNC = "Funcionarios"
TABELA_REG = "RegistrosPonto"
REGIAO = "us-east-1"

app = Flask(__name__)
CORS(app)

# Clients AWS
s3 = boto3.client('s3', region_name=REGIAO)
rekognition = boto3.client('rekognition', region_name=REGIAO)
dynamodb = boto3.resource('dynamodb', region_name=REGIAO)
tabela_funcionarios = dynamodb.Table(TABELA_FUNC)
tabela_registros = dynamodb.Table(TABELA_REG)

# Helper Functions
def enviar_s3(caminho, nome_arquivo):
    s3.upload_file(caminho, BUCKET, nome_arquivo)
    return f"https://{BUCKET}.s3.amazonaws.com/{nome_arquivo}"

def reconhecer_funcionario(caminho_foto):
    try:
        response = rekognition.search_faces_by_image(
            CollectionId=COLLECTION,
            Image={'Bytes': open(caminho_foto, 'rb').read()},
            MaxFaces=1,
            FaceMatchThreshold=85
        )
        return response['FaceMatches'][0]['Face']['ExternalImageId'] if response['FaceMatches'] else None
    except Exception as e:
        print(f"Erro no reconhecimento: {str(e)}")
        return None

# Rotas
@app.route('/registrar_ponto', methods=['POST'])
def registrar_ponto():
    if 'foto' not in request.files:
        return jsonify({"error": "Nenhuma foto enviada"}), 400
    
    foto = request.files['foto']
    temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
    foto.save(temp_path)
    
    funcionario_id = reconhecer_funcionario(temp_path)
    if not funcionario_id:
        os.remove(temp_path)
        return jsonify({"error": "Funcionário não reconhecido"}), 404

    # Obter o nome do funcionário pelo ID
    response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
    funcionario_nome = response['Item']['nome'] if 'Item' in response else 'Desconhecido'

    # Verificar registros do dia
    hoje = datetime.now().strftime('%Y-%m-%d')
    response_registros = tabela_registros.scan(
        FilterExpression='funcionario_id = :id AND begins_with(data_hora, :hoje)',
        ExpressionAttributeValues={':id': funcionario_id, ':hoje': hoje}
    )
    registros_do_dia = response_registros['Items']

    # Determinar o tipo (entrada ou saída)
    tipo = 'entrada' if not registros_do_dia or registros_do_dia[-1]['tipo'] == 'saída' else 'saída'

    registro = {
        'registro_id': str(uuid.uuid4()),
        'funcionario_id': funcionario_id,
        'data_hora': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'tipo': tipo
    }
    tabela_registros.put_item(Item=registro)
    
    os.remove(temp_path)
    return jsonify({
        "success": True,
        "funcionario": funcionario_nome,
        "hora": registro['data_hora'],
        "tipo": tipo
    })

@app.route('/funcionarios', methods=['GET'])
def listar_funcionarios():
    try:
        response = tabela_funcionarios.scan()
        return jsonify(response['Items'])
    except Exception as e:
        print(f"Erro no backend: {str(e)}")  # Log para debug
        return jsonify({'error': 'Erro interno no servidor'}), 500

@app.route('/funcionarios/<funcionario_id>', methods=['GET'])
def obter_funcionario(funcionario_id):
    try:
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        if 'Item' not in response:
            return jsonify({'error': 'Funcionário não encontrado'}), 404
        return jsonify(response['Item'])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/funcionarios/<funcionario_id>', methods=['PUT'])
def atualizar_funcionario(funcionario_id):
    try:
        # Obter os dados do funcionário antes de atualizar
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')

        if not funcionario:
            return jsonify({'error': 'Funcionário não encontrado'}), 404

        # Atualizar os dados do funcionário
        nome = request.form.get('nome')
        cargo = request.form.get('cargo')

        if not nome or not cargo:
            return jsonify({'error': 'Nome e cargo são obrigatórios'}), 400

        # Atualizar a foto, se enviada
        if 'foto' in request.files:
            foto = request.files['foto']
            temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
            foto.save(temp_path)

            # Substituir a foto no S3
            s3.upload_file(
                temp_path,
                BUCKET,
                f"funcionarios/{funcionario_id}.jpg",
                ExtraArgs={'ContentType': 'image/jpeg'}
            )
            foto_url = f"https://{BUCKET}.s3.{REGIAO}.amazonaws.com/funcionarios/{funcionario_id}.jpg"

            # Atualizar a face no Rekognition
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

            # Atualizar a URL da foto e o FaceId no banco de dados
            funcionario['foto_url'] = foto_url
            funcionario['face_id'] = face_id

        # Atualizar nome e cargo
        funcionario['nome'] = nome
        funcionario['cargo'] = cargo

        # Salvar as alterações no banco de dados
        tabela_funcionarios.put_item(Item=funcionario)

        return jsonify({'message': 'Funcionário atualizado com sucesso!'}), 200
    except Exception as e:
        print(f"Erro ao atualizar funcionário: {str(e)}")
        return jsonify({'error': 'Erro ao atualizar funcionário'}), 500

@app.route('/funcionarios/<funcionario_id>/foto', methods=['PUT'])
def atualizar_foto_funcionario(funcionario_id):
    if 'foto' not in request.files:
        return jsonify({"error": "Nenhuma foto enviada"}), 400
    
    foto = request.files['foto']
    temp_path = os.path.join(tempfile.gettempdir(), f"temp_{uuid.uuid4().hex}.jpg")
    foto.save(temp_path)
    
    try:
        # Remove face antiga
        response = rekognition.list_faces(CollectionId=COLLECTION)
        for face in response['Faces']:
            if face['ExternalImageId'] == funcionario_id:
                rekognition.delete_faces(
                    CollectionId=COLLECTION,
                    FaceIds=[face['FaceId']]
                )
        
        # Atualiza S3
        foto_nome = f"{funcionario_id}.jpg"
        foto_url = enviar_s3(temp_path, foto_nome)
        
        # Reindexa
        rekognition.index_faces(
            CollectionId=COLLECTION,
            Image={'S3Object': {'Bucket': BUCKET, 'Name': foto_nome}},
            ExternalImageId=funcionario_id
        )
        
        # Atualiza DynamoDB
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

@app.route('/funcionarios/<funcionario_id>', methods=['DELETE'])
def excluir_funcionario(funcionario_id):
    try:
        # Obter os dados do funcionário antes de excluir
        response = tabela_funcionarios.get_item(Key={'id': funcionario_id})
        funcionario = response.get('Item')

        if not funcionario:
            return jsonify({'error': 'Funcionário não encontrado'}), 404

        # Excluir os dados faciais do Rekognition
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

        # Excluir o funcionário do banco de dados
        tabela_funcionarios.delete_item(Key={'id': funcionario_id})

        return jsonify({'message': 'Funcionário excluído com sucesso'}), 200
    except Exception as e:
        print(f"Erro ao excluir funcionário: {str(e)}")
        return jsonify({'error': 'Erro ao excluir funcionário'}), 500

@app.route('/cadastrar_funcionario', methods=['POST'])
def cadastrar_funcionario():
    try:
        nome = request.form.get('nome')
        cargo = request.form.get('cargo')
        foto = request.files.get('foto')
        
        if not all([nome, cargo, foto]):
            return jsonify({"error": "Dados incompletos"}), 400
        
        funcionario_id = f"{nome.lower().replace(' ', '_')}_{uuid.uuid4().hex[:6]}"
        foto_nome = f"{funcionario_id}.jpg"
        temp_path = os.path.join(tempfile.gettempdir(), foto_nome)
        foto.save(temp_path)
        
        # Upload para S3
        foto_url = enviar_s3(temp_path, foto_nome)
        
        # Cadastro no Rekognition
        rekognition.index_faces(
            CollectionId=COLLECTION,
            Image={'S3Object': {'Bucket': BUCKET, 'Name': foto_nome}},
            ExternalImageId=funcionario_id,
            DetectionAttributes=['DEFAULT']
        )
        
        # Salvar no DynamoDB
        tabela_funcionarios.put_item(Item={
            'id': funcionario_id,
            'nome': nome,
            'cargo': cargo,
            'foto_url': foto_url,
            'data_cadastro': datetime.now().strftime('%Y-%m-%d')
        })
        
        os.remove(temp_path)
        return jsonify({
            "success": True, 
            "foto_url": foto_url,
            "id": funcionario_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/registros', methods=['GET'])
def listar_registros():
    data_inicio = request.args.get('inicio')
    data_fim = request.args.get('fim')
    nome_funcionario = request.args.get('nome')
    funcionario_id = request.args.get('funcionario_id')

    try:
        funcionarios_filtrados = []

        # Filtrar pelo nome do funcionário
        if nome_funcionario:
            response_func = tabela_funcionarios.scan(
                FilterExpression='contains(nome, :nome)',
                ExpressionAttributeValues={':nome': nome_funcionario}
            )
            funcionarios_filtrados = [f['id'] for f in response_func['Items']]

        # Filtrar diretamente pelo ID do funcionário
        if funcionario_id:
            funcionarios_filtrados = [funcionario_id]

        filtro = {}
        expression_attributes = {}
        conditions = []

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

        # Se estiver filtrando por funcionário específico, retornar os registros brutos
        if funcionario_id:
            # Adicionar nome do funcionário a cada registro
            funcionario = tabela_funcionarios.get_item(Key={'id': funcionario_id})
            funcionario_nome = funcionario['Item']['nome'] if 'Item' in funcionario else 'Desconhecido'
            
            for registro in registros:
                registro['funcionario_nome'] = funcionario_nome
            
            return jsonify(registros)
        
        # Se for consulta geral, calcular horas trabalhadas
        horas_trabalhadas_por_funcionario = {}
        for registro in registros:
            funcionario_id = registro['funcionario_id']
            if funcionario_id not in horas_trabalhadas_por_funcionario:
                horas_trabalhadas_por_funcionario[funcionario_id] = {
                    'nome': '',
                    'horas_trabalhadas': timedelta()
                }

            if registro['tipo'] == 'entrada':
                horas_trabalhadas_por_funcionario[funcionario_id]['ultima_entrada'] = datetime.strptime(
                    registro['data_hora'], '%Y-%m-%d %H:%M:%S'
                )
            elif registro['tipo'] == 'saída' and 'ultima_entrada' in horas_trabalhadas_por_funcionario[funcionario_id]:
                entrada = horas_trabalhadas_por_funcionario[funcionario_id].pop('ultima_entrada')
                saida = datetime.strptime(registro['data_hora'], '%Y-%m-%d %H:%M:%S')
                horas_trabalhadas_por_funcionario[funcionario_id]['horas_trabalhadas'] += saida - entrada

        # Substituir IDs pelos nomes
        for funcionario_id, dados in horas_trabalhadas_por_funcionario.items():
            funcionario = tabela_funcionarios.get_item(Key={'id': funcionario_id})
            dados['nome'] = funcionario['Item']['nome'] if 'Item' in funcionario else 'Desconhecido'

        # Formatar para exibição
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

@app.route('/funcionarios/nome', methods=['GET'])
def buscar_nomes():
    nome_parcial = request.args.get('nome', '')
    try:
        response = tabela_funcionarios.scan(
            FilterExpression='contains(nome, :nome)',
            ExpressionAttributeValues={':nome': nome_parcial}
        )
        nomes = [funcionario['nome'] for funcionario in response['Items']]
        return jsonify(nomes)
    except Exception as e:
        print(f"Erro ao buscar nomes: {str(e)}")
        return jsonify({'error': 'Erro ao buscar nomes'}), 500

@app.route('/enviar-email-registros', methods=['POST'])
def enviar_email_registros():
    try:
        data = request.json
        
        # Dados do relatório
        funcionario = data.get('funcionario', 'Funcionário não especificado')
        periodo = data.get('periodo', 'Período não especificado')
        registros = data.get('registros', [])
        email_destino = data.get('email')
        
        if not email_destino:
            return jsonify({'error': 'Email não fornecido'}), 400

        # Criar arquivo Excel em memória
        output = BytesIO()
        workbook = Workbook()
        
        # Planilha de resumo
        sheet_resumo = workbook.active
        sheet_resumo.title = "Resumo"
        sheet_resumo.append(["Relatório de Registros de Ponto"])
        sheet_resumo.append(["Funcionário:", funcionario])
        sheet_resumo.append(["Período:", periodo])
        sheet_resumo.append([])
        sheet_resumo.append(["Total de Registros:", len(registros)])
        
        # Planilha detalhada
        sheet_detalhes = workbook.create_sheet("Registros")
        sheet_detalhes.append(["Data", "Hora", "Tipo"])
        for registro in registros:
            data_hora = registro.get('data_hora', '').split(' ')
            sheet_detalhes.append([
                data_hora[0] if len(data_hora) > 0 else '',
                data_hora[1] if len(data_hora) > 1 else '',
                registro.get('tipo', '')
            ])
        
        # Salvar workbook no buffer
        workbook.save(output)
        output.seek(0)
        
        # Aqui você implementaria o envio real do email com o anexo
        # Exemplo com AWS SES:
        # ses = boto3.client('ses', region_name=REGIAO)
        # ses.send_raw_email(
        #     Source='seu-email@dominio.com',
        #     Destinations=[email_destino],
        #     RawMessage={
        #         'Data': criar_mensagem_email(output, email_destino, funcionario)
        #     }
        # )
        
        print(f"Simulando envio para {email_destino}")
        print(f"Relatório de {funcionario} ({periodo}) com {len(registros)} registros")
        
        return jsonify({
            'success': True,
            'message': f'Relatório enviado para {email_destino}'
        })
        
    except Exception as e:
        print(f"Erro ao enviar email: {str(e)}")
        return jsonify({'error': str(e)}), 500
                
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)