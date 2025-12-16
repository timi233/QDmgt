import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

// Configure axios to send cookies with requests
axios.defaults.withCredentials = true

export interface RegisterData {
  username: string
  email: string
  password: string
  name?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface User {
  id: string
  username: string
  email: string
  name?: string
  role: string
}

export interface LoginResponse {
  message: string
  user: User
}

export interface RegisterResponse {
  message: string
  user: User
}

/**
 * Register new user
 */
export async function register(data: RegisterData): Promise<RegisterResponse> {
  const response = await axios.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, data)
  return response.data
}

/**
 * Login user
 * Token is now stored in httpOnly cookie by the server
 */
export async function login(data: LoginData): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, data)

  // Save user info to localStorage (not the token - it's in httpOnly cookie)
  if (response.data.user) {
    localStorage.setItem('user', JSON.stringify(response.data.user))
  }

  return response.data
}

/**
 * Logout user
 * Clears the httpOnly cookie on the server
 */
export async function logout(): Promise<void> {
  try {
    // Call logout API - cookie is sent automatically
    await axios.post(`${API_BASE_URL}/auth/logout`)
  } catch (error) {
    console.error('Logout API error:', error)
  } finally {
    // Clear local storage
    localStorage.removeItem('user')
  }
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Get token from cookie (not accessible from JS due to httpOnly)
 * This function is deprecated - token is now in httpOnly cookie
 * @deprecated Token is stored in httpOnly cookie and not accessible from JavaScript
 */
export function getToken(): string | null {
  return null
}

/**
 * Check if user is authenticated
 * Since token is in httpOnly cookie, we check if user info exists in localStorage
 * Note: This is not 100% reliable - server should validate the actual cookie
 */
export function isAuthenticated(): boolean {
  return !!getCurrentUser()
}
