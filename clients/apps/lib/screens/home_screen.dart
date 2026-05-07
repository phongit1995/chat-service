import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';
import '../theme/app_gradients.dart';
import '../theme/app_typography.dart';
import '../theme/widgets.dart';
import 'user_search_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final convs = ref.watch(conversationsProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: Column(
        children: [
          Container(
            decoration: const BoxDecoration(gradient: AppGradients.signature),
            padding: EdgeInsets.fromLTRB(16, MediaQuery.of(context).padding.top + 12, 12, 16),
            child: Row(
              children: [
                GradientAvatar(
                  name: user?.displayName ?? '',
                  imageUrl: user?.avatar ?? user?.avatarURL,
                  size: 44,
                  storyRing: true,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hi ${user?.displayName ?? ''}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontFamily: AppTypography.display,
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                        ),
                      ),
                      Text(
                        'Online',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                  onPressed: () => ref.read(conversationsProvider.notifier).reload(),
                ),
                IconButton(
                  icon: const Icon(Icons.logout_rounded, color: Colors.white),
                  onPressed: () async {
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) context.go('/login');
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: convs.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (list) {
                if (list.isEmpty) return const _EmptyConversations();
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () => ref.read(conversationsProvider.notifier).reload(),
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 4),
                    itemBuilder: (_, i) => _ConversationTile(conv: list[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: Container(
        decoration: BoxDecoration(
          gradient: AppGradients.signature,
          shape: BoxShape.circle,
          boxShadow: AppShadows.glowGradient,
        ),
        child: FloatingActionButton(
          backgroundColor: Colors.transparent,
          elevation: 0,
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const UserSearchScreen()),
          ),
          child: const Icon(Icons.add_comment_rounded, color: Colors.white),
        ),
      ),
    );
  }
}

class _EmptyConversations extends StatelessWidget {
  const _EmptyConversations();
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
            child: const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white, size: 44),
          ),
          const SizedBox(height: 16),
          Text('No conversations yet', style: AppTypography.h3),
          const SizedBox(height: 6),
          const Text(
            'Tap the + button to start chatting',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final Conversation conv;
  const _ConversationTile({required this.conv});

  String _formatTime(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    final t = DateTime.tryParse(iso);
    if (t == null) return '';
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${t.month}/${t.day}';
  }

  @override
  Widget build(BuildContext context) {
    final unread = conv.unreadCount > 0;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push('/chat/${conv.id}', extra: conv),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(AppRadius.lg)),
          child: Row(
            children: [
              GradientAvatar(
                name: conv.displayName,
                imageUrl: conv.avatar,
                size: 48,
                storyRing: unread,
                seen: !unread,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            conv.displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                              fontFamily: AppTypography.body,
                            ),
                          ),
                        ),
                        Text(
                          _formatTime(conv.lastMessageAt),
                          style: TextStyle(
                            fontSize: 11,
                            color: unread ? AppColors.primary : AppColors.textTertiary,
                            fontWeight: unread ? FontWeight.w600 : FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Expanded(
                          child: _buildPreviewText(conv, unread),
                        ),
                        if (unread) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              gradient: AppGradients.signature,
                              borderRadius: BorderRadius.circular(AppRadius.full),
                              boxShadow: AppShadows.md,
                            ),
                            child: Text(
                              conv.unreadCount > 99 ? '99+' : '${conv.unreadCount}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ] else if (conv.isLastMessageFromMe) ...[
                          const SizedBox(width: 6),
                          Text(
                            conv.seen ? '✓✓' : '✓',
                            style: TextStyle(
                              fontSize: 13,
                              color: conv.seen ? AppColors.primary : AppColors.textTertiary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewText(Conversation conv, bool unread) {
    final hasText = conv.lastMessageText != null && conv.lastMessageText!.isNotEmpty;
    if (!hasText) {
      return Text(
        'No messages yet',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 13,
          color: AppColors.textTertiary,
          fontStyle: FontStyle.italic,
        ),
      );
    }

    String? prefix;
    if (conv.isLastMessageFromMe) {
      prefix = 'You: ';
    } else if (conv.type == 'group' &&
        conv.lastMessageSenderName != null &&
        conv.lastMessageSenderName!.isNotEmpty) {
      prefix = '${conv.lastMessageSenderName}: ';
    }

    final baseStyle = TextStyle(
      fontSize: 13,
      color: unread ? AppColors.textPrimary : AppColors.textSecondary,
      fontWeight: unread ? FontWeight.w600 : FontWeight.w400,
    );

    return RichText(
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      text: TextSpan(
        style: baseStyle,
        children: [
          if (prefix != null)
            TextSpan(
              text: prefix,
              style: baseStyle.copyWith(color: AppColors.textTertiary),
            ),
          TextSpan(text: conv.lastMessageText!),
        ],
      ),
    );
  }
}
