import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/providers.dart';
import 'providers/socket_listener_provider.dart';
import 'models/models.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/chat_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: ChatApp()));
}

class ChatApp extends ConsumerStatefulWidget {
  const ChatApp({super.key});
  @override
  ConsumerState<ChatApp> createState() => _ChatAppState();
}

class _ChatAppState extends ConsumerState<ChatApp> {
  late final GoRouter _router;
  late final _AuthListenable _authListenable;

  @override
  void initState() {
    super.initState();
    _authListenable = _AuthListenable(ref);
    _router = GoRouter(
      initialLocation: '/login',
      refreshListenable: _authListenable,
      redirect: (ctx, state) {
        final loggedIn = ref.read(authProvider).user != null;
        final atAuth =
            state.matchedLocation == '/login' ||
            state.matchedLocation == '/register';
        if (!loggedIn && !atAuth) return '/login';
        if (loggedIn && atAuth) return '/';
        return null;
      },
      routes: [
        GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
        GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
        GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
        GoRoute(
          path: '/chat/:id',
          builder: (_, st) => ChatScreen(
            conversationId: st.pathParameters['id']!,
            conversation: st.extra as Conversation?,
          ),
        ),
      ],
    );

    Future.microtask(() => ref.read(authProvider.notifier).tryRestoreSession());

    ref.listenManual<AuthState>(authProvider, (prev, next) {
      if (next.user != null) {
        ref.read(socketListenerProvider);
      }
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    _authListenable.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Chat App',
      theme: AppTheme.light(),
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(WidgetRef ref) {
    ref.listenManual<AuthState>(authProvider, (_, __) => notifyListeners());
  }
}
