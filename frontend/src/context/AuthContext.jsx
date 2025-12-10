import { createContext, useState, useEffect, useContext } from 'react'
import api from '../api/api'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    
    // Login function
    const login = async (email, password) => {
        // Create form data (FastAPI expects form data, not JSON)
        const formData = new URLSearchParams()
        formData.append('username', email)
        formData.append('password', password)
        
        const res = await api.post('/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        setUser({ email })   // update user state
        localStorage.setItem('access_token', res.data.access_token) // store token for future requests
    }

    // Signup function
    const signup = async (name, email, password) => {
    await api.post('/signup', { name, email, password })
    await login(email, password) // automatically log in after signup
  }

    // Logout function
    const logout = async () => {
        setUser(null) // clear user state
        localStorage.removeItem('access_token')
    }
    // Refresh token function
  const refreshToken = async () => {
    try {
      const res = await api.post('/refresh') // call backend refresh endpoint
      localStorage.setItem('access_token', res.data.access_token) // update token
      return res.data.access_token
    } catch (err) {
      logout() // if refresh fails, log out user
    }
  }
    // Axios interceptor to automatically refresh token on 401 errors
    useEffect(()=> {
        const interceptor = api.interceptors.response.use(
            (res) => res,
            async (err) => {
                const originalRequest = err.config
                // check if 401 (unauthorized) and retry not attempted yet
                if (err.response.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true
                    await refreshToken() // refresh token
                    originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`
                    return api(originalRequest) // retry original request
                }
                return Promise.reject(err) // otherwise reject error
            }
        )
        return () => api.interceptors.response.eject(interceptor) // cleanup on unmount
    }, [])

    // On mount, check if user is already logged in (token in localStorage)
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('access_token')
            if (token){
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`// set default auth header
                try {
          const res = await api.get('/me') // fetch user info from backend
          setUser(res.data) // set user state
        } catch (err) {
          localStorage.removeItem('access_token') // invalid token, remove it
        }
            }
            setLoading(false) // finished checking auth
        }
        loadUser()
    }, [])

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, refreshToken }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

// Custom hook to easily access AuthContext in components
export const useAuth = () => useContext(AuthContext)
