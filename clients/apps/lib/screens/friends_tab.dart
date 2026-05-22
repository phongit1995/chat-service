import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/friend.dart';
import '../providers/providers.dart';
import '../theme/app_colors.dart';
import '../theme/app_gradients.dart';
import '../theme/app_typography.dart';
import '../theme/widgets.dart';
import '../utils/relative_time.dart';
import 'user_search_screen.dart';
import 'user_profile_screen.dart';
import 'friends_management_modal.dart';

class FriendsTab extends ConsumerStatefulWidget {
  const FriendsTab({super.key});

  @override
  ConsumerState<FriendsTab> createState() => _FriendsTabState();
}

class _FriendsTabState extends ConsumerState<FriendsTab> {
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
    Future.microtask(() {
      if (!mounted) return;
      ref.read(friendsManagementProvider.notifier).refreshCounts();
    });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final threshold = _scrollController.position.maxScrollExtent - 200;
    if (_scrollController.position.pixels >= threshold) {
      ref.read(friendsRawProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncState = ref.watch(friendsProvider);

    return ColoredBox(
      color: AppColors.bgBase,
      child: Column(
        children: [
          _Header(total: asyncState.value?.total ?? 0),
          Expanded(
            child: asyncState.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (s) {
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () =>
                      ref.read(friendsRawProvider.notifier).refresh(),
                  child: ListView.separated(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 12,
                    ),
                    itemCount: 1 +
                        (s.friends.isEmpty ? 1 : s.friends.length) +
                        (s.hasMore ? 1 : 0),
                    separatorBuilder: (_, __) => const SizedBox(height: 4),
                    itemBuilder: (_, i) {
                      if (i == 0) return const _ManageFriendsEntry();
                      final idx = i - 1;
                      if (s.friends.isEmpty) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 32),
                          child: _EmptyFriends(),
                        );
                      }
                      if (idx >= s.friends.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      return _FriendTile(friend: s.friends[idx]);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final int total;
  const _Header({required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AppGradients.signature),
      padding: EdgeInsets.fromLTRB(
        16,
        MediaQuery.of(context).padding.top + 12,
        12,
        16,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Friends',
                  style: TextStyle(
                    color: Colors.white,
                    fontFamily: AppTypography.display,
                    fontWeight: FontWeight.w700,
                    fontSize: 22,
                  ),
                ),
                Text(
                  total > 0 ? '$total friends' : 'No friends yet',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white),
            tooltip: 'Add friend',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const UserSearchScreen()),
            ),
          ),
        ],
      ),
    );
  }
}

class _ManageFriendsEntry extends ConsumerWidget {
  const _ManageFriendsEntry();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending = ref.watch(friendsManagementProvider).requests.total;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => showFriendsManagementModal(context),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Container(
          margin: const EdgeInsets.only(bottom: 4),
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: AppGradients.signature,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.group_rounded, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Manage friends',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      pending > 0
                          ? '$pending pending request${pending == 1 ? '' : 's'}'
                          : 'Requests, sent, blocked',
                      style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
                    ),
                  ],
                ),
              ),
              if (pending > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  constraints: const BoxConstraints(minWidth: 22),
                  decoration: BoxDecoration(
                    gradient: AppGradients.signature,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(
                    pending > 99 ? '99+' : '$pending',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                    ),
                  ),
                ),
              const SizedBox(width: 6),
              Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyFriends extends StatelessWidget {
  const _EmptyFriends();
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              gradient: AppGradients.signature,
              shape: BoxShape.circle,
              boxShadow: AppShadows.glowGradient,
            ),
            child: const Icon(
              Icons.people_outline_rounded,
              color: Colors.white,
              size: 44,
            ),
          ),
          const SizedBox(height: 16),
          Text('No friends yet', style: AppTypography.h3),
          const SizedBox(height: 6),
          const Text(
            'Search people to send a friend request',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _FriendTile extends ConsumerWidget {
  final Friend friend;
  const _FriendTile({required this.friend});

  String _subtitle() {
    if (friend.isOnline) return 'Online';
    final last = friend.lastActiveAt;
    if (last != null && last.isNotEmpty) return formatLastActive(last);
    return '@${friend.username}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final subtitle = _subtitle();
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => showUserProfileModal(
          context,
          userId: friend.id,
          initialDisplayName: friend.displayName,
          initialAvatar: friend.avatar,
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              GradientAvatar(
                name: friend.displayName,
                imageUrl: friend.avatar,
                size: 48,
                status: friend.isOnline ? 'online' : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      friend.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: friend.isOnline
                            ? AppColors.success
                            : AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Send message',
                icon: const Icon(Icons.chat_bubble_outline_rounded),
                color: AppColors.primary,
                onPressed: () => _startChat(context, ref),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _startChat(BuildContext context, WidgetRef ref) async {
    try {
      final conv = await ref
          .read(conversationServiceProvider)
          .createDirectConversation(friend.id);
      await ref.read(conversationsRawProvider.notifier).reload();
      if (!context.mounted) return;
      context.push('/chat/${conv.id}', extra: conv);
    } catch (_) {}
  }
}
