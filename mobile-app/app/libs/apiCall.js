// libs/apiCall.ts
import axios from "axios";
import useStore from "../store";

const api = axios.create({
  baseURL: "http://192.168.42.46:5000/api-v1",
  timeout: 1000000,
});


// Set token automatically from store
api.interceptors.request.use(async (config) => {
  const { user } = useStore.getState();
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;
