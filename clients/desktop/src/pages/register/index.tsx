import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore, registerSchema, type RegisterFormValues } from '@chat/shared'
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

export const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', username: '', email: '', password: '', confirm: '' },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerUser(
        values.username.trim(),
        values.email.trim(),
        values.password,
        values.fullName?.trim() ?? '',
      )
      navigate('/login', { replace: true })
    } catch {
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-soft px-4 py-6 sm:py-10 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-warm opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-cool opacity-30 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-6 sm:mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-signature rounded-2xl shadow-glow-gradient mb-3 sm:mb-4">
            <svg className="w-8 h-8 sm:w-9 sm:h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-[28px] sm:text-[34px] leading-tight font-bold font-display">
            Join the <span className="text-gradient">vibe</span>
          </h1>
          <p className="text-sm sm:text-base text-ink-secondary mt-2">Create an account to start chatting</p>
        </div>

        <Card shadow="xl" className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full name"
              type="text"
              placeholder="How should we call you?"
              disabled={isLoading}
              autoComplete="name"
              error={errors.fullName?.message}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              {...register('fullName')}
            />

            <Input
              label="Username"
              type="text"
              placeholder="@yourhandle"
              disabled={isLoading}
              autoComplete="username"
              error={errors.username?.message}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 12h14M5 16h10" />
                </svg>
              }
              {...register('username')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              disabled={isLoading}
              autoComplete="email"
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
              placeholder="At least 6 characters"
              disabled={isLoading}
              autoComplete="new-password"
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

            <Input
              label="Confirm password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter password"
              disabled={isLoading}
              autoComplete="new-password"
              error={errors.confirm?.message}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="pointer-events-auto p-1 -m-1 rounded-full hover:bg-surface-overlay text-ink-tertiary hover:text-ink-secondary transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              }
              {...register('confirm')}
            />

            <p className="text-[12px] text-ink-tertiary bg-surface-tinted px-4 py-3 rounded-xl">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-ink-secondary text-[13px]">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-500 hover:text-primary-600 font-semibold">
                Sign in
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
