import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core_providers.dart';

class PresenceInfo {
  final bool isOnline;
  final String? lastActiveAt;
  PresenceInfo({required this.isOnline, this.lastActiveAt});
}

class PresenceNotifier extends Notifier<Map<String, PresenceInfo>>
    with WidgetsBindingObserver {
  Timer? _listTimer;
  Timer? _focusTimer;
  List<String> Function()? _getListUserIds;
  String? _focusUserId;
  bool _appActive = true;

  static const _listInterval = Duration(seconds: 60);
  static const _focusInterval = Duration(seconds: 15);

  @override
  Map<String, PresenceInfo> build() {
    WidgetsBinding.instance.addObserver(this);
    ref.onDispose(() {
      WidgetsBinding.instance.removeObserver(this);
      _listTimer?.cancel();
      _focusTimer?.cancel();
    });
    return {};
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appActive = state == AppLifecycleState.resumed;
    if (_appActive) {
      _pollList();
      if (_focusUserId != null) _pollFocus();
    }
  }

  Future<void> _fetch(List<String> userIds) async {
    if (userIds.isEmpty || !_appActive) return;
    try {
      final list = await ref.read(userServiceProvider).getPresenceBatch(userIds);
      final next = Map<String, PresenceInfo>.from(state);
      for (final p in list) {
        next[p.userId] = PresenceInfo(
          isOnline: p.isOnline,
          lastActiveAt: p.lastActiveAt,
        );
      }
      state = next;
    } catch (_) {}
  }

  void _pollList() {
    final ids = _getListUserIds?.call() ?? [];
    _fetch(ids);
  }

  void _pollFocus() {
    final id = _focusUserId;
    if (id != null) _fetch([id]);
  }

  void startListPolling(List<String> Function() getUserIds) {
    _getListUserIds = getUserIds;
    _listTimer?.cancel();
    _pollList();
    _listTimer = Timer.periodic(_listInterval, (_) => _pollList());
  }

  void stopListPolling() {
    _listTimer?.cancel();
    _listTimer = null;
    _getListUserIds = null;
  }

  void startFocusPolling(String userId) {
    _focusUserId = userId;
    _focusTimer?.cancel();
    _pollFocus();
    _focusTimer = Timer.periodic(_focusInterval, (_) => _pollFocus());
  }

  void stopFocusPolling() {
    _focusTimer?.cancel();
    _focusTimer = null;
    _focusUserId = null;
  }
}

final presenceProvider =
    NotifierProvider<PresenceNotifier, Map<String, PresenceInfo>>(
  PresenceNotifier.new,
);
