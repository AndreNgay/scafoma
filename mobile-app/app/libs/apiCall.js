// libs/apiCall.ts
import axios from "axios";
import useStore from "../store";

const api = axios.create({
  baseURL: "https://scafoma.onrender.com/api-v1",
  timeout: 10000,
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
