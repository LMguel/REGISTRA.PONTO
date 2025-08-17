import axios from 'axios';

const api = axios.create({
  // Use relative URL if proxy is configured, otherwise use full URL
  baseURL: process.env.NODE_ENV === 'development' 
    ? '/api'  // This will use the proxy
    : 'https://2qa8v6qhfj.execute-api.us-east-1.amazonaws.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para tratamento global de erros
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({ message: 'Timeout - Servidor não respondeu' });
    }
    
    // Log more detailed error information
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config
    });
    
    return Promise.reject(error);
  }
);

export default api;