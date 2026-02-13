export interface LoginForm {
  username: string
  password: string
}

export interface RegisterForm {
  fullName: string
  idNumber: string
  undergraduateYears: string
  email: string
  password: string
  confirmPassword: string
}

export interface UserData {
  fullName: string
  idNumber: string
  undergraduateYears: string
  username: string
  email: string
  role: "user" | "admin"
  createdAt: string
}
