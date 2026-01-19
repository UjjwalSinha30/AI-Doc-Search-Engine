import axios from 'axios';

// const api = axios.create({
//     baseURL: 'http://localhost:8000/api',
//     withCredentials: true,
// })
const api = axios.create({
    baseURL: import.meta.env.PROD ? "/api" :`${import.meta.env.VITE_API_BASE_URL}/api`,
    withCredentials: true,
});

export default api;
