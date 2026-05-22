import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/relationship.dart';
import 'core_providers.dart';
import 'friends_provider.dart';

enum FriendsMgmtTab { requests, sent, blocked }

class ListSlice {
  final List<RelationshipResponse> items;
  final int total;
  final bool loading;
  final bool loaded;
  final String? error;

  const ListSlice({
    this.items = const [],
    this.total = 0,
    this.loading = false,
    this.loaded = false,
    this.error,
  });

  ListSlice copyWith({
    List<RelationshipResponse>? items,
    int? total,
    bool? loading,
    bool? loaded,
    String? error,
    bool clearError = false,
  }) =>
      ListSlice(
        items: items ?? this.items,
        total: total ?? this.total,
        loading: loading ?? this.loading,
        loaded: loaded ?? this.loaded,
        error: clearError ? null : (error ?? this.error),
      );
}

class FriendsManagementState {
  final ListSlice requests;
  final ListSlice sent;
  final ListSlice blocked;

  const FriendsManagementState({
    this.requests = const ListSlice(),
    this.sent = const ListSlice(),
    this.blocked = const ListSlice(),
  });

  FriendsManagementState copyWith({
    ListSlice? requests,
    ListSlice? sent,
    ListSlice? blocked,
  }) =>
      FriendsManagementState(
        requests: requests ?? this.requests,
        sent: sent ?? this.sent,
        blocked: blocked ?? this.blocked,
      );

  ListSlice sliceOf(FriendsMgmtTab t) => switch (t) {
        FriendsMgmtTab.requests => requests,
        FriendsMgmtTab.sent => sent,
        FriendsMgmtTab.blocked => blocked,
      };
}

class FriendsManagementNotifier extends Notifier<FriendsManagementState> {
  static const _pageSize = 50;

  @override
  FriendsManagementState build() => const FriendsManagementState();

  ListSlice _slice(FriendsMgmtTab t) => state.sliceOf(t);

  void _setSlice(FriendsMgmtTab t, ListSlice s) {
    state = switch (t) {
      FriendsMgmtTab.requests => state.copyWith(requests: s),
      FriendsMgmtTab.sent => state.copyWith(sent: s),
      FriendsMgmtTab.blocked => state.copyWith(blocked: s),
    };
  }

  Future<RelationshipListData> _fetch(FriendsMgmtTab t) {
    final svc = ref.read(relationshipServiceProvider);
    return switch (t) {
      FriendsMgmtTab.requests => svc.getPendingRequests(limit: _pageSize),
      FriendsMgmtTab.sent => svc.getSentRequests(limit: _pageSize),
      FriendsMgmtTab.blocked => svc.getBlockedUsers(limit: _pageSize),
    };
  }

  Future<void> loadTab(FriendsMgmtTab t, {bool force = false}) async {
    final current = _slice(t);
    if (current.loading) return;
    if (current.loaded && !force) return;
    _setSlice(t, current.copyWith(loading: true, clearError: true));
    try {
      final data = await _fetch(t);
      _setSlice(t, ListSlice(
        items: data.relationships,
        total: data.total,
        loaded: true,
        loading: false,
      ));
    } catch (_) {
      _setSlice(t, current.copyWith(loading: false, error: 'Failed to load'));
    }
  }

  Future<void> refreshTab(FriendsMgmtTab t) => loadTab(t, force: true);

  Future<void> refreshCounts() async {
    try {
      final data = await ref
          .read(relationshipServiceProvider)
          .getPendingRequests(limit: 1);
      _setSlice(
        FriendsMgmtTab.requests,
        _slice(FriendsMgmtTab.requests).copyWith(total: data.total),
      );
    } catch (_) {}
  }

  Future<void> refreshAfterAction() async {
    final tasks = <Future<void>>[];
    for (final t in FriendsMgmtTab.values) {
      if (_slice(t).loaded) tasks.add(refreshTab(t));
    }
    if (!_slice(FriendsMgmtTab.requests).loaded) tasks.add(refreshCounts());
    final friends = ref.read(friendsRawProvider).value;
    if (friends?.loaded == true) {
      tasks.add(ref.read(friendsRawProvider.notifier).refresh());
    }
    await Future.wait(tasks);
  }

  void reset() {
    state = const FriendsManagementState();
  }
}

final friendsManagementProvider =
    NotifierProvider<FriendsManagementNotifier, FriendsManagementState>(
        FriendsManagementNotifier.new);
