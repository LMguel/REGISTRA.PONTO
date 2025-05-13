import boto3

# Configurações
COLLECTION = "FuncionariosCollection"  # Nome da coleção no Rekognition
REGIAO = "us-east-1"  # Região AWS
TABELA_FUNC = "Funcionarios"  # Nome da tabela DynamoDB

# Inicializar clientes AWS
rekognition = boto3.client('rekognition', region_name=REGIAO)
dynamodb = boto3.resource('dynamodb', region_name=REGIAO)
tabela_funcionarios = dynamodb.Table(TABELA_FUNC)

def limpar_faces_excluidas():
    try:
        # Obter todos os IDs de funcionários no DynamoDB
        response = tabela_funcionarios.scan()
        funcionarios_existentes = {item['id'] for item in response.get('Items', [])}

        # Listar todas as faces na coleção do Rekognition
        rekognition_response = rekognition.list_faces(CollectionId=COLLECTION)
        faces_para_excluir = []

        for face in rekognition_response['Faces']:
            external_image_id = face['ExternalImageId']
            if external_image_id not in funcionarios_existentes:
                # Adicionar FaceId à lista de exclusão
                faces_para_excluir.append(face['FaceId'])

        # Excluir as faces que não estão no DynamoDB
        if faces_para_excluir:
            rekognition.delete_faces(CollectionId=COLLECTION, FaceIds=faces_para_excluir)
            print(f"{len(faces_para_excluir)} faces excluídas da coleção.")
        else:
            print("Nenhuma face para excluir.")

    except Exception as e:
        print(f"Erro ao limpar faces excluídas: {str(e)}")

if __name__ == "__main__":
    limpar_faces_excluidas()