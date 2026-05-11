import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../theme/app_colors.dart';
import '../theme/app_gradients.dart';
import '../theme/app_typography.dart';
import '../theme/widgets.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController(text: 'test1@gmail.com');
  final _password = TextEditingController(text: '123456');

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final ok = await ref
        .read(authProvider.notifier)
        .login(_email.text.trim(), _password.text);
    if (ok && mounted) context.go('/');
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    return Scaffold(
      body: Stack(
        children: [
          const Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(gradient: AppGradients.soft),
            ),
          ),
          Positioned(
            top: -120,
            left: -120,
            child: _Blob(size: 320, gradient: AppGradients.warm, opacity: 0.35),
          ),
          Positioned(
            bottom: -120,
            right: -120,
            child: _Blob(size: 320, gradient: AppGradients.cool, opacity: 0.35),
          ),
          Center(
            child: SingleChildScrollView(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          gradient: AppGradients.signature,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: AppShadows.glowGradient,
                        ),
                        child: const Icon(
                          Icons.chat_bubble_rounded,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                      const SizedBox(height: 16),
                      GradientText('Welcome back', style: AppTypography.h1),
                      const SizedBox(height: 6),
                      const Text(
                        'Sign in to continue the conversation',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 28),
                      _Card(
                        child: Column(
                          children: [
                            TextField(
                              controller: _email,
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                prefixIcon: Icon(Icons.alternate_email_rounded),
                              ),
                              keyboardType: TextInputType.emailAddress,
                            ),
                            const SizedBox(height: 14),
                            TextField(
                              controller: _password,
                              decoration: const InputDecoration(
                                labelText: 'Password',
                                prefixIcon: Icon(Icons.lock_outline_rounded),
                              ),
                              obscureText: true,
                            ),
                            if (auth.error != null) ...[
                              const SizedBox(height: 12),
                              Text(
                                auth.error!,
                                style: const TextStyle(color: AppColors.danger),
                              ),
                            ],
                            const SizedBox(height: 18),
                            GradientButton(
                              onPressed: auth.loading ? null : _submit,
                              loading: auth.loading,
                              fullWidth: true,
                              child: const Text('Sign in'),
                            ),
                            const SizedBox(height: 6),
                            TextButton(
                              onPressed: () => context.go('/register'),
                              child: const Text("New here? Create an account"),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        '© 2026 Chat App',
                        style: TextStyle(
                          color: AppColors.textTertiary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgSurface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        boxShadow: AppShadows.lg,
        border: Border.all(color: AppColors.lineSubtle),
      ),
      child: child,
    );
  }
}

class _Blob extends StatelessWidget {
  final double size;
  final Gradient gradient;
  final double opacity;
  const _Blob({
    required this.size,
    required this.gradient,
    required this.opacity,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Opacity(
        opacity: opacity,
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(gradient: gradient, shape: BoxShape.circle),
          child: const SizedBox.shrink(),
        ),
      ),
    );
  }
}
