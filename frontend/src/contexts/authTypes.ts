export interface User {
  id: number
  name: string
  email: string
  role: 'solicitante' | 'aprovador' | 'financeiro'
}

export interface RegisterData {
  name: string
  email: string
  password: string
  departmentId: number
}

export interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
}
