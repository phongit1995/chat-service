import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/ws_events.dart';
import 'core_providers.dart';

class TypingInfo {
  final String userId;
  final String username;
  TypingInfo({required this.userId, required this.username});
}

class TypingNotifier extends Notifier<Map<String, TypingInfo>> {
  StreamSubscription<TypingPayload>? _typingSub;
  StreamSubscription<TypingPayload>? _stopTypingSub;
  final Map<String, Timer> _timers = {};
  String? _conversationId;

  @override
  Map<String, TypingInfo> build() {
    ref.onDispose(_dispose);
    return {};
  }

  void init(String conversationId) {
    if (_conversationId == conversationId) return;
    _dispose();
    _conversationId = conversationId;
    state = {};

    final socket = ref.read(socketProvider);

    _typingSub = socket.onUserTyping.listen((p) {
      if (p.conversationId != _conversationId) return;
      _timers[p.userId]?.cancel();
      _timers[p.userId] = Timer(const Duration(seconds: 3), () {
        _removeUser(p.userId);
      });
      state = {
        ...state,
        p.userId: TypingInfo(
          userId: p.userId,
          username: p.username ?? 'Someone',
        ),
      };
    });

    _stopTypingSub = socket.onUserStopTyping.listen((p) {
      if (p.conversationId != _conversationId) return;
      _removeUser(p.userId);
    });
  }

  void _removeUser(String userId) {
    _timers[userId]?.cancel();
    _timers.remove(userId);
    if (state.containsKey(userId)) {
      final next = Map<String, TypingInfo>.from(state)..remove(userId);
      state = next;
    }
  }

  void _dispose() {
    _typingSub?.cancel();
    _stopTypingSub?.cancel();
    for (final t in _timers.values) {
      t.cancel();
    }
    _timers.clear();
    _conversationId = null;
  }
}

final typingProvider =
    NotifierProvider<TypingNotifier, Map<String, TypingInfo>>(
  TypingNotifier.new,
);
