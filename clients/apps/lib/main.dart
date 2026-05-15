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
import 'screens/call/call_screen.dart';
import 'screens/call/incoming_call_overlay.dart';
import 'providers/call_provider.dart';
import 'theme/app_theme.dart';
import 'utils/toast.dart' show navigatorKey;

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
      navigatorKey: navigatorKey,
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
      builder: (context, child) {
        return _CallLayer(child: child ?? const SizedBox());
      },
    );
  }
}

class _AuthListenable extends ChangeNotifier {
  _AuthListenable(WidgetRef ref) {
    ref.listenManual<AuthState>(authProvider, (_, __) => notifyListeners());
  }
}

/// Layers the route content with the global call screen (full-screen when
/// expanded, mini widget when collapsed) and the incoming call overlay.
class _CallLayer extends ConsumerWidget {
  final Widget child;
  const _CallLayer({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(callProvider.select((s) => s.mode));
    final expanded = ref.watch(callProvider.select((s) => s.expanded));
    final inCall = mode == CallMode.outgoing || mode == CallMode.active;
    final fullScreen = inCall && expanded;

    return Stack(
      children: [
        // Hide the route under the full-screen call to save resources, but
        // keep it mounted so state survives.
        Offstage(offstage: fullScreen, child: child),
        if (inCall) const Positioned.fill(child: CallScreen()),
        const Positioned.fill(child: IncomingCallOverlay()),
      ],
    );
  }
}
