import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.1.105:5000', // 👉 Seu IP na rede
});

export default api;