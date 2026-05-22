import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/friend.dart';
import 'core_providers.dart';
import 'presence_provider.dart';

class FriendsState {
  final List<Friend> friends;
  final int total;
  final int offset;
  final bool loadingMore;
  final bool loaded;

  const FriendsState({
    this.friends = const [],
    this.total = 0,
    this.offset = 0,
    this.loadingMore = false,
    this.loaded = false,
  });

  FriendsState copyWith({
    List<Friend>? friends,
    int? total,
    int? offset,
    bool? loadingMore,
    bool? loaded,
  }) => FriendsState(
        friends: friends ?? this.friends,
        total: total ?? this.total,
        offset: offset ?? this.offset,
        loadingMore: loadingMore ?? this.loadingMore,
        loaded: loaded ?? this.loaded,
      );

  bool get hasMore => friends.length < total;
}

class FriendsNotifier extends AsyncNotifier<FriendsState> {
  static const _pageSize = 50;

  @override
  Future<FriendsState> build() async {
    final data = await ref
        .read(relationshipServiceProvider)
        .getFriends(limit: _pageSize, offset: 0);
    return FriendsState(
      friends: data.friends,
      total: data.total,
      offset: data.friends.length,
      loaded: true,
    );
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || current.loadingMore || !current.hasMore) return;
    state = AsyncValue.data(current.copyWith(loadingMore: true));
    try {
      final data = await ref
          .read(relationshipServiceProvider)
          .getFriends(limit: _pageSize, offset: current.offset);
      state = AsyncValue.data(current.copyWith(
        friends: [...current.friends, ...data.friends],
        total: data.total,
        offset: current.offset + data.friends.length,
        loadingMore: false,
      ));
    } catch (_) {
      state = AsyncValue.data(current.copyWith(loadingMore: false));
    }
  }

  Future<void> refresh() async {
    try {
      final data = await ref
          .read(relationshipServiceProvider)
          .getFriends(limit: _pageSize, offset: 0);
      state = AsyncValue.data(FriendsState(
        friends: data.friends,
        total: data.total,
        offset: data.friends.length,
        loaded: true,
      ));
    } catch (_) {}
  }

  void reset() {
    state = const AsyncValue.data(FriendsState());
  }
}

final friendsRawProvider =
    AsyncNotifierProvider<FriendsNotifier, FriendsState>(FriendsNotifier.new);

final friendsProvider = Provider<AsyncValue<FriendsState>>((ref) {
  final raw = ref.watch(friendsRawProvider);
  final presence = ref.watch(presenceProvider);
  return raw.whenData((s) {
    var changed = false;
    final merged = <Friend>[];
    for (final f in s.friends) {
      final live = presence[f.id];
      if (live == null ||
          (live.isOnline == f.isOnline && live.lastActiveAt == f.lastActiveAt)) {
        merged.add(f);
      } else {
        merged.add(f.copyWith(isOnline: live.isOnline, lastActiveAt: live.lastActiveAt));
        changed = true;
      }
    }
    return changed ? s.copyWith(friends: merged) : s;
  });
});
