import base64
import json
from urllib.parse import unquote_plus

def lambda_response(app, event, context):
    """
    Adaptador simples para Flask no Lambda sem dependências externas
    """
    # Extrair informações do evento Lambda
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    query_string = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    body = event.get('body', '')
    is_base64 = event.get('isBase64Encoded', False)
    
    # Decodificar body se necessário
    if is_base64 and body:
        body = base64.b64decode(body).decode('utf-8')
    
    # Construir query string
    query_items = []
    for key, value in query_string.items():
        if value is not None:
            query_items.append(f"{key}={value}")
    query_str = "&".join(query_items)
    
    # Construir URL completa
    if query_str:
        full_path = f"{path}?{query_str}"
    else:
        full_path = path
    
    # Criar ambiente WSGI
    environ = {
        'REQUEST_METHOD': http_method,
        'SCRIPT_NAME': '',
        'PATH_INFO': unquote_plus(path),
        'QUERY_STRING': query_str,
        'CONTENT_TYPE': headers.get('content-type', ''),
        'CONTENT_LENGTH': str(len(body)) if body else '0',
        'SERVER_NAME': headers.get('host', 'localhost').split(':')[0],
        'SERVER_PORT': '80',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': 'https',
        'wsgi.input': body,
        'wsgi.errors': None,
        'wsgi.multithread': False,
        'wsgi.multiprocess': True,
        'wsgi.run_once': False
    }
    
    # Adicionar headers como HTTP_*
    for key, value in headers.items():
        key = key.upper().replace('-', '_')
        if key not in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
            environ[f'HTTP_{key}'] = value
    
    # Capturar resposta
    response_data = {}
    
    def start_response(status, response_headers, exc_info=None):
        response_data['status'] = int(status.split(' ')[0])
        response_data['headers'] = {}
        for header_name, header_value in response_headers:
            response_data['headers'][header_name] = header_value
    
    # Executar aplicação Flask
    with app.request_context(environ):
        app_response = app.full_dispatch_request()
        
        # Preparar resposta para Lambda
        return {
            'statusCode': app_response.status_code,
            'headers': dict(app_response.headers),
            'body': app_response.get_data(as_text=True),
            'isBase64Encoded': False
        }