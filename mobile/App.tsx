import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/auth/AuthContext';
import AuthFlow from './src/auth/AuthFlow';

export default function App() {
  return (
    <AuthProvider>
      <AuthFlow />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
