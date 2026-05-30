import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from './AuthContext';

type AuthScreen =
  | 'signin'
  | 'signup'
  | 'confirm'
  | 'forgot'
  | 'reset'
  | 'verify-email';

function Title({ children }: { children: React.ReactNode }) {
  return <Text className="text-3xl font-bold text-white">{children}</Text>;
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text className="mt-2 text-sm text-slate-300">{children}</Text>;
}

function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'number-pad'
    | 'phone-pad'
    | 'url'
    | 'numeric';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      className="h-12 rounded-xl border border-white/15 bg-white/10 px-4 text-white"
    />
  );
}

function ActionButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className="mt-2 h-12 items-center justify-center rounded-xl bg-cyan-400"
      style={({ pressed }) => [{ opacity: pressed || disabled || loading ? 0.7 : 1 }]}
    >
      {loading ? <ActivityIndicator color="#0f172a" /> : <Text className="font-semibold text-slate-900">{label}</Text>}
    </Pressable>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View className="rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2">
      <Text className="text-sm text-red-200">{message}</Text>
    </View>
  );
}

export default function AuthFlow() {
  const {
    user,
    isBooting,
    isLoading,
    error,
    isOtpRequired,
    otpEmail,
    apiBaseUrl,
    signIn,
    verifyOtp,
    resendOtp,
    signUp,
    resendVerification,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    logout,
    clearError,
    cancelOtp,
  } = useAuth();

  const [screen, setScreen] = useState<AuthScreen>('signin');

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (active) {
          setUrl(initialUrl ?? null);
        }
      } catch {
        // ignore
      }
    };

    void loadInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url: nextUrl }) => {
      setUrl(nextUrl);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const tokenFromUrl = useMemo(() => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('token') || parsed.searchParams.get('key') || '';
    } catch {
      return '';
    }
  }, [url]);

  useEffect(() => {
    if (tokenFromUrl) {
      setScreen('verify-email');
    }
  }, [tokenFromUrl]);

  if (isBooting) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#22d3ee" size="large" />
        <Text className="mt-4 text-slate-300">Cargando sesion...</Text>
      </View>
    );
  }

  if (user) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <View className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6">
          <Text className="text-sm font-semibold uppercase tracking-[2px] text-cyan-300">Autenticado</Text>
          <Text className="mt-3 text-2xl font-bold text-white">Hola, {user.fullname || user.username}</Text>
          <Text className="mt-3 text-slate-300">Tu sesion esta activa. El siguiente paso es migrar dashboard mobile.</Text>
          <Text className="mt-4 text-xs text-slate-400">API: {apiBaseUrl}</Text>
          <ActionButton label="Cerrar sesion" onPress={logout} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-950"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center px-5 py-10">
          <View className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-6">
            {isOtpRequired ? (
              <OtpScreen
                email={otpEmail || ''}
                loading={isLoading}
                error={error}
                onVerify={verifyOtp}
                onResend={resendOtp}
                onBack={cancelOtp}
              />
            ) : (
              <AuthScreens
                screen={screen}
                setScreen={(next) => {
                  clearError();
                  setScreen(next);
                }}
                loading={isLoading}
                error={error}
                signIn={signIn}
                signUp={signUp}
                resendVerification={resendVerification}
                verifyEmail={verifyEmail}
                requestPasswordReset={requestPasswordReset}
                resetPassword={resetPassword}
                tokenFromUrl={tokenFromUrl}
              />
            )}
          </View>

          <Text className="mt-6 text-center text-xs text-slate-400">Conectando con API: {apiBaseUrl}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthScreens({
  screen,
  setScreen,
  loading,
  error,
  signIn,
  signUp,
  resendVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  tokenFromUrl,
}: {
  screen: AuthScreen;
  setScreen: (screen: AuthScreen) => void;
  loading: boolean;
  error: string | null;
  signIn: (data: { email: string; password: string }) => Promise<{ otpRequired: boolean }>;
  signUp: (data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string, passwordConfirmation: string) => Promise<void>;
  tokenFromUrl: string;
}) {
  const [message, setMessage] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirmation, setSignupPasswordConfirmation] = useState('');

  const [confirmEmail, setConfirmEmail] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  const [verifyToken, setVerifyToken] = useState(tokenFromUrl || '');

  const [resetToken, setResetToken] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState('');

  useEffect(() => {
    if (tokenFromUrl) {
      setVerifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const resetFeedback = () => setMessage('');

  if (screen === 'signin') {
    return (
      <>
        <Title>Inicia sesion</Title>
        <Subtitle>Accede con tu correo y contrasena.</Subtitle>
        <View className="mt-5 gap-3">
          <ErrorBanner message={error} />
          {!!message && <Text className="text-sm text-emerald-300">{message}</Text>}
          <Input
            value={email}
            onChangeText={(v) => {
              resetFeedback();
              setEmail(v);
            }}
            placeholder="Correo"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            value={password}
            onChangeText={(v) => {
              resetFeedback();
              setPassword(v);
            }}
            placeholder="Contrasena"
            secureTextEntry
            autoCapitalize="none"
          />
          <ActionButton
            label="Iniciar sesion"
            loading={loading}
            onPress={async () => {
              if (!email || !password) {
                setMessage('Completa correo y contrasena');
                return;
              }

              await signIn({ email: email.trim(), password });
            }}
          />
        </View>

        <AuthLinks
          links={[
            { label: 'Crear cuenta', onPress: () => setScreen('signup') },
            { label: 'Olvide mi contrasena', onPress: () => setScreen('forgot') },
            { label: 'No recibi confirmacion', onPress: () => setScreen('confirm') },
          ]}
        />
      </>
    );
  }

  if (screen === 'signup') {
    return (
      <>
        <Title>Crea tu cuenta</Title>
        <Subtitle>Registro con validacion y correo de verificacion.</Subtitle>
        <View className="mt-5 gap-3">
          <ErrorBanner message={error} />
          {!!message && <Text className="text-sm text-emerald-300">{message}</Text>}
          <Input value={fullName} onChangeText={setFullName} placeholder="Nombre completo" />
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder="Nombre de usuario"
            autoCapitalize="none"
          />
          <Input
            value={signupEmail}
            onChangeText={setSignupEmail}
            placeholder="Correo"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            value={signupPassword}
            onChangeText={setSignupPassword}
            placeholder="Contrasena"
            secureTextEntry
            autoCapitalize="none"
          />
          <Input
            value={signupPasswordConfirmation}
            onChangeText={setSignupPasswordConfirmation}
            placeholder="Confirmar contrasena"
            secureTextEntry
            autoCapitalize="none"
          />
          <ActionButton
            label="Crear cuenta"
            loading={loading}
            onPress={async () => {
              if (!fullName || !username || !signupEmail || !signupPassword || !signupPasswordConfirmation) {
                setMessage('Todos los campos son requeridos');
                return;
              }

              if (signupPassword !== signupPasswordConfirmation) {
                setMessage('Las contrasenas no coinciden');
                return;
              }

              await signUp({
                fullName,
                username,
                email: signupEmail.trim(),
                password: signupPassword,
                passwordConfirmation: signupPasswordConfirmation,
              });

              setConfirmEmail(signupEmail.trim());
              setMessage('Cuenta creada. Revisa tu correo para verificar.');
              setScreen('verify-email');
            }}
          />
        </View>
        <AuthLinks links={[{ label: 'Volver a iniciar sesion', onPress: () => setScreen('signin') }]} />
      </>
    );
  }

  if (screen === 'confirm') {
    return (
      <>
        <Title>Reenviar confirmacion</Title>
        <Subtitle>Si la cuenta existe y no esta verificada, enviaremos un enlace.</Subtitle>
        <View className="mt-5 gap-3">
          <ErrorBanner message={error} />
          {!!message && <Text className="text-sm text-emerald-300">{message}</Text>}
          <Input
            value={confirmEmail}
            onChangeText={(v) => {
              resetFeedback();
              setConfirmEmail(v);
            }}
            placeholder="Correo"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <ActionButton
            label="Reenviar confirmacion"
            loading={loading}
            onPress={async () => {
              if (!confirmEmail) {
                setMessage('Ingresa un correo');
                return;
              }
              await resendVerification(confirmEmail.trim());
              setMessage('Solicitud enviada. Revisa tu correo y spam.');
            }}
          />
        </View>
        <AuthLinks links={[{ label: 'Volver a iniciar sesion', onPress: () => setScreen('signin') }]} />
      </>
    );
  }

  if (screen === 'forgot') {
    return (
      <>
        <Title>Recuperar contrasena</Title>
        <Subtitle>Te enviaremos un enlace para crear una nueva contrasena.</Subtitle>
        <View className="mt-5 gap-3">
          <ErrorBanner message={error} />
          {!!message && <Text className="text-sm text-emerald-300">{message}</Text>}
          <Input
            value={forgotEmail}
            onChangeText={(v) => {
              resetFeedback();
              setForgotEmail(v);
            }}
            placeholder="Correo"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <ActionButton
            label="Enviar instrucciones"
            loading={loading}
            onPress={async () => {
              if (!forgotEmail) {
                setMessage('Ingresa un correo');
                return;
              }
              await requestPasswordReset(forgotEmail.trim());
              setMessage('Si el correo existe, te enviamos instrucciones.');
            }}
          />
        </View>
        <AuthLinks
          links={[
            { label: 'Tengo token de reset', onPress: () => setScreen('reset') },
            { label: 'Volver a iniciar sesion', onPress: () => setScreen('signin') },
          ]}
        />
      </>
    );
  }

  if (screen === 'reset') {
    return (
      <>
        <Title>Nueva contrasena</Title>
        <Subtitle>Ingresa token y tu nueva contrasena.</Subtitle>
        <View className="mt-5 gap-3">
          <ErrorBanner message={error} />
          {!!message && <Text className="text-sm text-emerald-300">{message}</Text>}
          <Input
            value={resetToken}
            onChangeText={setResetToken}
            placeholder="Token de reset"
            autoCapitalize="none"
          />
          <Input
            value={resetPasswordValue}
            onChangeText={setResetPasswordValue}
            placeholder="Nueva contrasena"
            secureTextEntry
            autoCapitalize="none"
          />
          <Input
            value={resetPasswordConfirmation}
            onChangeText={setResetPasswordConfirmation}
            placeholder="Confirmar contrasena"
            secureTextEntry
            autoCapitalize="none"
          />
          <ActionButton
            label="Restablecer"
            loading={loading}
            onPress={async () => {
              if (!resetToken || !resetPasswordValue || !resetPasswordConfirmation) {
                setMessage('Todos los campos son requeridos');
                return;
              }

              await resetPassword(resetToken.trim(), resetPasswordValue, resetPasswordConfirmation);
              setMessage('Contrasena actualizada. Ahora inicia sesion.');
              setScreen('signin');
            }}
          />
        </View>
        <AuthLinks links={[{ label: 'Volver', onPress: () => setScreen('signin') }]} />
      </>
    );
  }

  return (
    <>
      <Title>Verificar correo</Title>
      <Subtitle>Pega el token del correo o abre el link desde el dispositivo.</Subtitle>
      <View className="mt-5 gap-3">
        <ErrorBanner message={error} />
        {!!message && <Text className="text-sm text-emerald-300">{message}</Text>}
        <Input
          value={verifyToken}
          onChangeText={setVerifyToken}
          placeholder="Token de verificacion"
          autoCapitalize="none"
        />
        <ActionButton
          label="Verificar"
          loading={loading}
          onPress={async () => {
            if (!verifyToken) {
              setMessage('Ingresa un token de verificacion');
              return;
            }
            await verifyEmail(verifyToken.trim());
            setMessage('Correo verificado. Ya puedes iniciar sesion.');
            setScreen('signin');
          }}
        />
      </View>

      <AuthLinks
        links={[
          {
            label: 'Reenviar verificacion',
            onPress: async () => {
              if (!confirmEmail) {
                setMessage('Ingresa el correo en pantalla de confirmacion para reenviar');
                setScreen('confirm');
                return;
              }
              await resendVerification(confirmEmail.trim());
              setMessage('Correo de verificacion reenviado.');
            },
          },
          { label: 'Volver a iniciar sesion', onPress: () => setScreen('signin') },
        ]}
      />
    </>
  );
}

function AuthLinks({ links }: { links: { label: string; onPress: () => void | Promise<void> }[] }) {
  return (
    <View className="mt-5 gap-2">
      {links.map((link) => (
        <Pressable key={link.label} onPress={() => void link.onPress()}>
          <Text className="text-center text-sm text-cyan-300">{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function OtpScreen({
  email,
  loading,
  error,
  onVerify,
  onResend,
  onBack,
}: {
  email: string;
  loading: boolean;
  error: string | null;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [localMessage, setLocalMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const refs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((current) => (current > 0 ? current - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const verifyIfComplete = async (nextDigits: string[]) => {
    if (nextDigits.some((digit) => digit.length !== 1)) return;
    const code = nextDigits.join('');
    await onVerify(code);
  };

  const updateDigit = async (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    setLocalMessage('');

    const nextDigits = [...digits];
    nextDigits[index] = value;
    setDigits(nextDigits);

    if (value && index < refs.current.length - 1) {
      refs.current[index + 1]?.focus();
    }

    try {
      await verifyIfComplete(nextDigits);
    } catch {
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Title>Verificacion OTP</Title>
      <Subtitle>Te enviamos un codigo de 6 digitos a {email}.</Subtitle>

      <View className="mt-5 gap-3">
        <ErrorBanner message={error} />
        {!!localMessage && <Text className="text-sm text-emerald-300">{localMessage}</Text>}

        <View className="flex-row justify-between">
          {digits.map((digit, index) => (
            <TextInput
              key={`otp-${index}`}
              ref={(ref) => {
                refs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(value) => {
                void updateDigit(index, value);
              }}
              onKeyPress={(event) => {
                if (event.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
                  refs.current[index - 1]?.focus();
                }
              }}
              maxLength={1}
              keyboardType="number-pad"
              className="h-12 w-11 rounded-xl border border-white/20 bg-white/10 text-center text-xl font-bold text-white"
            />
          ))}
        </View>

        <Text className="text-center text-sm text-slate-300">Codigo valido: {formatTime(timeLeft)}</Text>

        <ActionButton
          label="Verificar codigo"
          loading={loading}
          onPress={async () => {
            const code = digits.join('');
            if (code.length !== 6) {
              setLocalMessage('Completa los 6 digitos');
              return;
            }
            await onVerify(code);
          }}
        />

        <Pressable
          onPress={async () => {
            if (timeLeft > 240 || loading) return;
            await onResend();
            setDigits(['', '', '', '', '', '']);
            refs.current[0]?.focus();
            setTimeLeft(300);
            setLocalMessage('Codigo reenviado al correo.');
          }}
        >
          <Text className="text-center text-sm text-cyan-300">
            {timeLeft > 240 ? `Reenviar disponible en ${formatTime(timeLeft - 240)}` : 'Reenviar codigo'}
          </Text>
        </Pressable>

        <Pressable onPress={onBack}>
          <Text className="text-center text-sm text-slate-300">Volver a inicio de sesion</Text>
        </Pressable>
      </View>
    </>
  );
}
