import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // 👉 Seu IP na rede
});

export default api;
