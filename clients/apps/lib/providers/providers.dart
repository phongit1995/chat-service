import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../models/models.dart';

final apiProvider = Provider<ApiService>((ref) => ApiService());

final socketProvider = Provider<SocketService>((ref) {
  final s = SocketService();
  ref.onDispose(s.dispose);
  return s;
});

class AuthState {
  final User? user;
  final bool loading;
  final String? error;
  AuthState({this.user, this.loading = false, this.error});

  AuthState copyWith({User? user, bool? loading, String? error, bool clearUser = false, bool clearError = false}) =>
      AuthState(
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
      return true;
    } catch (e) {
      state = state.copyWith(loading: false, error: _extractError(e));
      return false;
    }
  }

  Future<bool> register(String username, String email, String password, String fullName) async {
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
    state = AuthState();
  }

  String _extractError(Object e) {
    final s = e.toString();
    return s.length > 200 ? s.substring(0, 200) : s;
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class ActiveConversationNotifier extends Notifier<String?> {
  @override
  String? build() => null;
  void set(String? id) => state = id;
}

final activeConversationProvider =
    NotifierProvider<ActiveConversationNotifier, String?>(ActiveConversationNotifier.new);

class ConversationsNotifier extends AsyncNotifier<List<Conversation>> {
  @override
  Future<List<Conversation>> build() async {
    final socket = ref.read(socketProvider);

    socket.onConversationCreated.listen((_) => reload());
    socket.onConversationUpdated.listen((data) {
      final id = data['id'] as String?;
      final seen = data['seen'];
      if (id != null && seen is bool) {
        final list = state.value ?? [];
        final idx = list.indexWhere((c) => c.id == id);
        if (idx >= 0) {
          final newList = [...list];
          newList[idx] = list[idx].copyWith(seen: seen);
          state = AsyncValue.data(newList);
          return;
        }
      }
      reload();
    });
    socket.onConversationDeleted.listen((id) {
      final list = state.value ?? [];
      state = AsyncValue.data(list.where((c) => c.id != id).toList());
    });

    socket.onNewMessage.listen((event) {
      final msg = event.message;
      final list = state.value ?? [];
      final idx = list.indexWhere((c) => c.id == msg.conversationId);

      if (idx < 0) {
        reload();
        return;
      }

      final me = ref.read(authProvider).user?.id;
      final activeId = ref.read(activeConversationProvider);
      final isActive = activeId == msg.conversationId;
      final old = list[idx];
      final isFromMe = msg.senderId == me;

      int unread = old.unreadCount;
      if (isActive) {
        unread = 0;
      } else if (!isFromMe) {
        unread = old.unreadCount + 1;
      }

      final updated = old.copyWith(
        lastMessageText: msg.content,
        lastMessageAt: msg.createdAt,
        lastMessageSenderId: msg.senderId,
        lastMessageSenderName: msg.senderName,
        isLastMessageFromMe: isFromMe,
        seen: isFromMe ? false : isActive,
        unreadCount: unread,
      );

      final newList = [updated, ...list.where((c) => c.id != msg.conversationId)];
      state = AsyncValue.data(newList);

      if (isActive && !isFromMe) {
        ref.read(apiProvider).markAsRead(msg.conversationId).catchError((_) {});
      }
    });

    return ref.read(apiProvider).getConversations();
  }

  Future<void> reload() async {
    try {
      final list = await ref.read(apiProvider).getConversations();
      state = AsyncValue.data(list);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void markRead(String conversationId) {
    final list = state.value ?? [];
    final idx = list.indexWhere((c) => c.id == conversationId);
    if (idx < 0) return;
    final old = list[idx];
    if (old.unreadCount == 0) return;
    final newList = [...list];
    newList[idx] = old.copyWith(unreadCount: 0);
    state = AsyncValue.data(newList);
  }
}

final conversationsProvider =
    AsyncNotifierProvider<ConversationsNotifier, List<Conversation>>(ConversationsNotifier.new);
