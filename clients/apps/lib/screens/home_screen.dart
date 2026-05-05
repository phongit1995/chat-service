import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../models/models.dart';
import 'user_search_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final convs = ref.watch(conversationsProvider);
    final user = ref.watch(authProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: Text('Hi ${user?.displayName ?? ''}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(conversationsProvider.notifier).reload(),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const UserSearchScreen()),
        ),
        child: const Icon(Icons.add_comment),
      ),
      body: convs.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(child: Text('No conversations yet. Tap + to start chatting.'));
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(conversationsProvider.notifier).reload(),
            child: ListView.separated(
              itemCount: list.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) => _ConversationTile(conv: list[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final Conversation conv;
  const _ConversationTile({required this.conv});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundImage: conv.avatar != null && conv.avatar!.isNotEmpty
            ? NetworkImage(conv.avatar!)
            : null,
        child: (conv.avatar == null || conv.avatar!.isEmpty)
            ? Text(conv.displayName.isNotEmpty ? conv.displayName[0].toUpperCase() : '?')
            : null,
      ),
      title: Text(conv.displayName, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(
        conv.lastMessageText ?? 'No messages yet',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: conv.unreadCount > 0
          ? CircleAvatar(
              radius: 12,
              backgroundColor: Colors.blue,
              child: Text('${conv.unreadCount}',
                  style: const TextStyle(color: Colors.white, fontSize: 12)),
            )
          : null,
      onTap: () => context.push('/chat/${conv.id}', extra: conv),
    );
  }
}
