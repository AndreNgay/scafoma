// libs/apiCall.ts
import axios from 'axios'
import useStore from '../store'

const API_HOST = process.env.EXPO_PUBLIC_API_HOST || 'localhost'

const api = axios.create({
  baseURL: "http://192.168.15.30.com/api-v1",
  timeout: 60000,
});


// Set token automatically from store
api.interceptors.request.use(async (config) => {
	const { user } = useStore.getState()
	if (user?.token) {
		config.headers.Authorization = `Bearer ${user.token}`
	}
	return config
})

export default api
