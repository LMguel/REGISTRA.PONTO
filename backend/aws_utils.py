import boto3
import os
import uuid
from datetime import datetime

REGIAO = "us-east-1"
BUCKET = "ponto-eletronico-fotos-us"
COLLECTION = "FuncionariosCollection"
TABELA_FUNC = "Funcionarios"
TABELA_REG = "RegistrosPonto"

s3 = boto3.client('s3', region_name=REGIAO)
rekognition = boto3.client('rekognition', region_name=REGIAO)
dynamodb = boto3.resource('dynamodb', region_name=REGIAO)
tabela_funcionarios = dynamodb.Table(TABELA_FUNC)
tabela_registros = dynamodb.Table(TABELA_REG)

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
