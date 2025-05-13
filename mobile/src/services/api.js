// mobile-app/src/services/api.js
import axios from 'axios';

export default axios.create({
  baseURL: 'http://SEU_IP:5000',  // Altere para seu IP local
  timeout: 10000
});