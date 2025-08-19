import axios from "axios";

const api = axios.create({
  baseURL: "https://2qa8v6qhfj.execute-api.us-east-1.amazonaws.com/Stage/api", 
  timeout: 10000,
});

// Interceptor para adicionar o token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // onde você salvou o JWT no login
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
