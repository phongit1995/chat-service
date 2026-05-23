import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../utils/toast.dart';
import 'active_conversation_provider.dart';
import 'conversations_provider.dart';
import 'core_providers.dart';
import 'friends_provider.dart';
import 'friends_management_provider.dart';
import '../services/remembered_login.dart';

class AuthState {
  final User? user;
  final bool loading;
  final bool initialized;
  final String? error;

  AuthState({
    this.user,
    this.loading = false,
    this.initialized = false,
    this.error,
  });

  AuthState copyWith({
    User? user,
    bool? loading,
    bool? initialized,
    String? error,
    bool clearUser = false,
    bool clearError = false,
  }) => AuthState(
    user: clearUser ? null : (user ?? this.user),
    loading: loading ?? this.loading,
    initialized: initialized ?? this.initialized,
    error: clearError ? null : (error ?? this.error),
  );
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => AuthState();

  Future<void> tryRestoreSession() async {
    final auth = ref.read(authServiceProvider);
    final token = await auth.getToken();
    if (token == null) {
      state = state.copyWith(initialized: true);
      return;
    }

    try {
      final user = await ref.read(userServiceProvider).getProfile();
      state = state.copyWith(user: user, initialized: true);
      ref.read(socketProvider).connect(token);
      ref.invalidate(conversationsRawProvider);
    } catch (_) {
      await auth.logout();
      state = state.copyWith(clearUser: true, initialized: true);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final result = await ref.read(authServiceProvider).login(email, password);
      state = state.copyWith(user: result.user, loading: false);
      ref.read(socketProvider).connect(result.token);
      ref.invalidate(conversationsRawProvider);
      showSuccessToast('Welcome back, ${result.user.displayName}!');
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
      await ref
          .read(authServiceProvider)
          .register(username, email, password, fullName);
      return await login(email, password);
    } catch (e) {
      state = state.copyWith(loading: false, error: _extractError(e));
      return false;
    }
  }

  void updateUser(User user) {
    state = state.copyWith(user: user);
  }

  Future<void> logout() async {
    ref.read(socketProvider).disconnect();
    ref.read(activeConversationProvider.notifier).set(null);
    ref.invalidate(friendsRawProvider);
    ref.read(friendsManagementProvider.notifier).reset();
    await ref.read(authServiceProvider).logout();
    await RememberedLoginStore.clear();
    state = AuthState(initialized: true);
  }

  String _extractError(Object e) {
    if (e is DioException) {
      if (e.message != null && e.message!.isNotEmpty) return e.message!;
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        final msg = data['error'];
        if (msg is String && msg.isNotEmpty) return msg;
      }
    }
    final s = e.toString();
    return s.length > 200 ? s.substring(0, 200) : s;
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
