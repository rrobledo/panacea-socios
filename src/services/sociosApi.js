import axios from 'axios';

const client = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const buscarPorDni = (dni) =>
  client.get('/socios/', { params: { dni } });

export const buscarPorNombre = (nombre) =>
  client.get('/socios/', { params: { name: nombre } });

export const registrarVenta = (data) =>
  client.post('/ventas/', data);
