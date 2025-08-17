import base64
import json
from urllib.parse import unquote_plus
from io import BytesIO

def lambda_response(app, event, context):
    """
    Adaptador para Flask no Lambda com suporte melhorado para CORS e multipart
    """
    try:
        # Extrair informações do evento Lambda
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        query_string = event.get('queryStringParameters') or {}
        headers = event.get('headers') or {}
        body = event.get('body', '')
        is_base64 = event.get('isBase64Encoded', False)
        
        print(f"Lambda Request - Method: {http_method}, Path: {path}")
        print(f"Headers: {headers}")
        
        # Decodificar body se necessário
        if is_base64 and body:
            body = base64.b64decode(body)
        elif body and isinstance(body, str):
            body = body.encode('utf-8')
        elif not body:
            body = b''
        else:
            body = body
        
        # Construir query string
        query_items = []
        for key, value in query_string.items():
            if value is not None:
                query_items.append(f"{key}={value}")
        query_str = "&".join(query_items)
        
        # Normalizar headers (converter para lowercase)
        normalized_headers = {}
        for key, value in headers.items():
            normalized_headers[key.lower()] = value
        
        # Obter content-type
        content_type = normalized_headers.get('content-type', '')
        content_length = len(body) if body else 0
        
        # Criar ambiente WSGI
        environ = {
            'REQUEST_METHOD': http_method,
            'SCRIPT_NAME': '',
            'PATH_INFO': unquote_plus(path),
            'QUERY_STRING': query_str,
            'CONTENT_TYPE': content_type,
            'CONTENT_LENGTH': str(content_length),
            'SERVER_NAME': normalized_headers.get('host', 'localhost').split(':')[0],
            'SERVER_PORT': '443',  # HTTPS por padrão no API Gateway
            'wsgi.version': (1, 0),
            'wsgi.url_scheme': 'https',
            'wsgi.input': BytesIO(body),
            'wsgi.errors': None,
            'wsgi.multithread': False,
            'wsgi.multiprocess': True,
            'wsgi.run_once': False
        }
        
        # Adicionar headers como HTTP_*
        for key, value in normalized_headers.items():
            key = key.upper().replace('-', '_')
            if key not in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
                environ[f'HTTP_{key}'] = value
        
        # Executar aplicação Flask
        with app.request_context(environ):
            app_response = app.full_dispatch_request()
            
            # Preparar headers de resposta
            response_headers = dict(app_response.headers)
            
            # Garantir headers CORS essenciais (caso não tenham sido adicionados)
            if 'Access-Control-Allow-Origin' not in response_headers:
                response_headers['Access-Control-Allow-Origin'] = '*'
            if 'Access-Control-Allow-Methods' not in response_headers:
                response_headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
            if 'Access-Control-Allow-Headers' not in response_headers:
                response_headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
            
            # Obter o corpo da resposta
            response_body = app_response.get_data(as_text=True)
            
            # Preparar resposta para Lambda
            lambda_response = {
                'statusCode': app_response.status_code,
                'headers': response_headers,
                'body': response_body,
                'isBase64Encoded': False
            }
            
            print(f"Lambda Response - Status: {app_response.status_code}")
            print(f"Response Headers: {response_headers}")
            
            return lambda_response
            
    except Exception as e:
        print(f"Lambda adapter error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Retornar erro com headers CORS
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Erro interno do servidor',
                'message': str(e)
            }),
            'isBase64Encoded': False
        }