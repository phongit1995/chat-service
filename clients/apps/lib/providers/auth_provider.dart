import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import 'active_conversation_provider.dart';
import 'conversations_provider.dart';
import 'core_providers.dart';

class AuthState {
  final User? user;
  final bool loading;
  final String? error;

  AuthState({this.user, this.loading = false, this.error});

  AuthState copyWith({
    User? user,
    bool? loading,
    String? error,
    bool clearUser = false,
    bool clearError = false,
  }) => AuthState(
    user: clearUser ? null : (user ?? this.user),
    loading: loading ?? this.loading,
    error: clearError ? null : (error ?? this.error),
  );
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => AuthState();

  Future<void> tryRestoreSession() async {
    final api = ref.read(apiProvider);
    final token = await api.getToken();
    if (token == null) return;

    try {
      final user = await api.getProfile();
      state = state.copyWith(user: user);
      ref.read(socketProvider).connect(token);
      ref.invalidate(conversationsProvider);
    } catch (_) {
      await api.logout();
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = ref.read(apiProvider);
      final data = await api.login(email, password);
      final user = User.fromJson(data['user'] as Map<String, dynamic>);
      state = state.copyWith(user: user, loading: false);
      ref.read(socketProvider).connect(data['token'] as String);
      ref.invalidate(conversationsProvider);
      return true;
    } catch (e) {
      state = state.copyWith(loading: false, error: _extractError(e));
      return false;
    }
  }

  Future<bool> register(
    String username,
    String email,
    String password,
    String fullName,
  ) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final api = ref.read(apiProvider);
      await api.register(username, email, password, fullName);
      return await login(email, password);
    } catch (e) {
      state = state.copyWith(loading: false, error: _extractError(e));
      return false;
    }
  }

  Future<void> logout() async {
    await ref.read(apiProvider).logout();
    ref.read(socketProvider).disconnect();
    ref.read(activeConversationProvider.notifier).set(null);
    state = AuthState();
  }

  String _extractError(Object e) {
    final s = e.toString();
    return s.length > 200 ? s.substring(0, 200) : s;
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
