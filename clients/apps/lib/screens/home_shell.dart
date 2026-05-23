import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/providers.dart';
import '../theme/app_colors.dart';
import 'home_screen.dart';
import 'friends_tab.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _index = 0;

  static const _tabs = <Widget>[
    ChatsTab(),
    FriendsTab(),
  ];

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      ref.read(presenceProvider.notifier).startListPolling(_collectIds);
    });
  }

  @override
  void dispose() {
    ref.read(presenceProvider.notifier).stopListPolling();
    super.dispose();
  }

  List<String> _collectIds() {
    final ids = <String>{};
    final convs = ref.read(conversationsProvider).value ?? [];
    for (final c in convs) {
      if (c.isDirect && c.otherUser?.id != null) {
        ids.add(c.otherUser!.id);
      }
    }
    final friends = ref.read(friendsRawProvider).value?.friends ?? [];
    for (final f in friends) {
      ids.add(f.id);
    }
    return ids.toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon: Icon(Icons.chat_bubble_rounded),
            label: 'Chats',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline_rounded),
            selectedIcon: Icon(Icons.people_rounded),
            label: 'Friends',
          ),
        ],
      ),
    );
  }
}
