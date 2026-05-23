import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../theme/app_colors.dart';
import '../theme/app_gradients.dart';
import '../theme/app_typography.dart';
import '../theme/widgets.dart';
import '../utils/toast.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});
  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _fullName = TextEditingController();
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  String? _confirmError;

  @override
  void dispose() {
    _fullName.dispose();
    _username.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _confirmError = null);
    if (_password.text != _confirm.text) {
      setState(() => _confirmError = 'Passwords do not match');
      return;
    }
    if (_password.text.length < 6) {
      setState(() => _confirmError = 'Password must be at least 6 characters');
      return;
    }
    final ok = await ref
        .read(authProvider.notifier)
        .register(
          _username.text.trim(),
          _email.text.trim(),
          _password.text,
          _fullName.text.trim(),
        );
    if (!mounted) return;
    if (ok) {
      context.go('/');
    } else {
      final error = ref.read(authProvider).error;
      showErrorToast(error ?? 'Registration failed');
    }
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
          Center(
            child: SingleChildScrollView(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
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
                          Icons.person_add_alt_1_rounded,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                      const SizedBox(height: 16),
                      GradientText('Join the vibe', style: AppTypography.h1),
                      const SizedBox(height: 6),
                      const Text(
                        'Create an account to start chatting',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 28),
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.bgSurface,
                          borderRadius: BorderRadius.circular(AppRadius.xl),
                          boxShadow: AppShadows.lg,
                          border: Border.all(color: AppColors.lineSubtle),
                        ),
                        child: AutofillGroup(
                          child: Column(
                            children: [
                              TextField(
                                controller: _fullName,
                                decoration: const InputDecoration(
                                  labelText: 'Full name',
                                  prefixIcon: Icon(Icons.badge_outlined),
                                ),
                                textInputAction: TextInputAction.next,
                                autofillHints: const [AutofillHints.name],
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _username,
                                decoration: const InputDecoration(
                                  labelText: 'Username',
                                  prefixIcon: Icon(Icons.alternate_email_rounded),
                                ),
                                textInputAction: TextInputAction.next,
                                autofillHints: const [AutofillHints.newUsername],
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _email,
                                decoration: const InputDecoration(
                                  labelText: 'Email',
                                  prefixIcon: Icon(Icons.mail_outline_rounded),
                                ),
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                autofillHints: const [AutofillHints.email],
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _password,
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  prefixIcon: const Icon(Icons.lock_outline_rounded),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscurePassword
                                          ? Icons.visibility_off_outlined
                                          : Icons.visibility_outlined,
                                    ),
                                    onPressed: () => setState(
                                        () => _obscurePassword = !_obscurePassword),
                                  ),
                                ),
                                obscureText: _obscurePassword,
                                textInputAction: TextInputAction.next,
                                autofillHints: const [AutofillHints.newPassword],
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _confirm,
                                decoration: InputDecoration(
                                  labelText: 'Confirm password',
                                  prefixIcon: const Icon(Icons.lock_outline_rounded),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscureConfirm
                                          ? Icons.visibility_off_outlined
                                          : Icons.visibility_outlined,
                                    ),
                                    onPressed: () => setState(
                                        () => _obscureConfirm = !_obscureConfirm),
                                  ),
                                  errorText: _confirmError,
                                ),
                                obscureText: _obscureConfirm,
                                textInputAction: TextInputAction.done,
                                autofillHints: const [AutofillHints.newPassword],
                                onSubmitted: (_) =>
                                    auth.loading ? null : _submit(),
                              ),
                              const SizedBox(height: 16),
                              GradientButton(
                                onPressed: auth.loading ? null : _submit,
                                loading: auth.loading,
                                fullWidth: true,
                                child: const Text('Create account'),
                              ),
                              TextButton(
                                onPressed: () => context.go('/login'),
                                child: const Text('Back to sign in'),
                              ),
                            ],
                          ),
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
