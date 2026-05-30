export interface SignInForm {
  email: string;
  password: string;
}

export interface SignUpForm {
  fullName: string;
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  fullname: string;
  roles: string[];
  permissions: string[];
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  message: string;
  status?: number;
}
