import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { signOut } from '../context/AuthContext';
import { AuthTokenError } from './errors/AuthTokenErro';

interface FailedRequestQueue {
    onSuccess: (token: string) => void;
    onFailure: (error: AxiosError) => void;
  };

  let isRefreshing = false;
  let failedRequestsQueue: Array<FailedRequestQueue> = [];
  
export function setupAPIClient(context = undefined) {
    
    let cookies = parseCookies(context);
   
    const api = axios.create({
        baseURL: 'http://localhost:3333',
        headers: {
            Authorization: `Bearer ${cookies['nextauth.token']}`
        }
    })
    
    api.interceptors.response.use(response => {
        return response
    }, (error: AxiosError) => {
        if(error.response.status === 401) {
            if(error.response.data?.code === 'token.expired') {
                cookies = parseCookies(context);
    
                const { 'nextauth.refreshToken': refreshToken } = cookies;
                const originalConfig = error.config; // config toda a configuração do request
    
                if(!isRefreshing) {
                    isRefreshing = true;
    
                    api.post('/refresh', {
                        refreshToken
                    }).then(response => {
                        const { token } = response.data
        
                        setCookie(context, 'nextauth.token', token, {
                            maxAge: 60 * 60 * 24 * 30, // 30 days
                            path: '/'
                        })
                        setCookie(context, 'nextauth.refreshToken', response.data.refreshToken, {
                            maxAge: 60 * 60 * 24 * 30, // 30 days
                            path: '/'
                        })
        
                        api.defaults.headers['Authorization'] = `Bearer ${token}`
    
                        failedRequestsQueue.forEach(request => request.onSuccess(token)) 
                        failedRequestsQueue = []
    
                        if(typeof window !== 'undefined') {
                            signOut();
                        }
                    })
                    .catch(error => {
                        failedRequestsQueue.forEach(request => request.onFailure(error)) 
                        failedRequestsQueue = []
                    })
                    .finally(() => {
                        isRefreshing = false
                    })
                }
                return new Promise((resolve, reject) => {
                    failedRequestsQueue.push({
                        onSuccess: (token: string) => {
                            originalConfig.headers['Authorization'] = `Bearer ${token}`
    
                            resolve(api(originalConfig))
                        },
                        onFailure: (error: AxiosError) => {
                            reject(error)
                        }
                    })
                })
    
    
            } else {
                if(typeof window !== 'undefined') {
                    signOut();
                } else {
                    return Promise.reject(new AuthTokenError())
                }
            }
        }
        return Promise.reject(error);
    })
    return api;
}