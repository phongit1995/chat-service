import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore, rememberedLoginStore, loginSchema, type LoginFormValues } from '@chat/shared'
import { Button, Input, Card } from '@chat/ui'

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
) : (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

export const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  })

  useEffect(() => {
    const saved = rememberedLoginStore.read()
    if (saved) reset({ email: saved.email, password: saved.password, remember: true })
  }, [reset])

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.email.trim(), values.password)
      if (values.remember) rememberedLoginStore.save(values.email.trim(), values.password)
      else rememberedLoginStore.clear()
      navigate('/chat', { replace: true })
    } catch {
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-soft px-4 py-6 sm:py-10 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-warm opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-cool opacity-30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-6 sm:mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-signature rounded-2xl shadow-glow-gradient mb-3 sm:mb-4">
            <svg className="w-8 h-8 sm:w-9 sm:h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-[28px] sm:text-[34px] leading-tight font-bold font-display">
            Welcome <span className="text-gradient">back</span>
          </h1>
          <p className="text-sm sm:text-base text-ink-secondary mt-2">Sign in to continue the conversation</p>
        </div>

        <Card shadow="xl" className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              disabled={isLoading}
              autoComplete="username"
              error={errors.email?.message}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              {...register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="current-password"
              error={errors.password?.message}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="pointer-events-auto p-1 -m-1 rounded-full hover:bg-surface-overlay text-ink-tertiary hover:text-ink-secondary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              }
              {...register('password')}
            />

            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center cursor-pointer text-ink-secondary">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary-500 rounded border-line"
                  {...register('remember')}
                />
                <span className="ml-2">Remember me</span>
              </label>
              <a href="#" className="text-primary-500 hover:text-primary-600 font-semibold">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-ink-secondary text-[13px]">
              New here?{' '}
              <Link to="/register" className="text-primary-500 hover:text-primary-600 font-semibold">
                Create an account
              </Link>
            </p>
          </div>
        </Card>

        <p className="text-center text-ink-tertiary text-[12px] mt-6">
          © 2026 Chat App. All rights reserved.
        </p>
      </div>
    </div>
  )
}
