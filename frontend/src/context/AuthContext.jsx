import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/api'; // your axios instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // backend exposes /me under /api/me (api.js baseURL is /api)
        const res = await api.get('/me');
        setUser(res.data);
      } catch (err) {
        console.error('Failed to load user:', err);
        localStorage.removeItem('access_token');
        delete api.defaults.headers.common['Authorization'];
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Token refresh interceptor
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshRes = await api.post('/refresh');
            const newToken = refreshRes.data.access_token;
            localStorage.setItem('access_token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            localStorage.removeItem('access_token');
            delete api.defaults.headers.common['Authorization'];
            setUser(null);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token } = response.data;
      // store access token and set header for subsequent requests
      localStorage.setItem('access_token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      // backend sets refresh cookie on /login; now fetch /me
      const userRes = await api.get('/me');
      setUser(userRes.data);
      return userRes.data;
    } catch (err) {
      console.error('Login failed', err);
      throw err;
    }
  };

  const signup = async (name, email, password) => {
    try {
      await api.post('/signup', { name, email, password });
      await login(email, password);
    } catch (err) {
      console.error('Signup failed', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      // ignore server errors on logout
    }
    localStorage.removeItem('access_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = { user, isLoading, login, signup, logout };

  // console.log('AuthProvider render → isLoading:', isLoading, 'user:', user);
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};