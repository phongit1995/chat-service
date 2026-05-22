import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'providers/providers.dart';
import 'providers/socket_listener_provider.dart';
import 'models/models.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_shell.dart';
import 'screens/chat_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/call/call_screen.dart';
import 'screens/call/incoming_call_overlay.dart';
import 'providers/call_provider.dart';
import 'theme/app_theme.dart';
import 'utils/toast.dart' show navigatorKey;
import 'utils/permissions.dart';

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
      initialLocation: '/splash',
      refreshListenable: _authListenable,
      redirect: (ctx, state) {
        final auth = ref.read(authProvider);
        final atSplash = state.matchedLocation == '/splash';
        final atAuth =
            state.matchedLocation == '/login' ||
            state.matchedLocation == '/register';

        if (!auth.initialized) {
          return atSplash ? null : '/splash';
        }
        if (atSplash) {
          return auth.user != null ? '/' : '/login';
        }
        if (auth.user == null && !atAuth) return '/login';
        if (auth.user != null && atAuth) return '/';
        return null;
      },
      routes: [
        GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
        GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
        GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
        GoRoute(path: '/', builder: (_, __) => const HomeShell()),
        GoRoute(
          path: '/chat/:id',
          builder: (_, st) {
            final extra = st.extra;
            Conversation? conv;
            if (extra is Conversation) {
              conv = extra;
            } else if (extra is Map<String, dynamic>) {
              conv = Conversation.fromJson(extra);
            }
            return ChatScreen(
              conversationId: st.pathParameters['id']!,
              conversation: conv,
            );
          },
        ),
      ],
    );

    Future.microtask(() => ref.read(authProvider.notifier).tryRestoreSession());

    ref.listenManual<AuthState>(authProvider, (prev, next) {
      if (next.user != null) {
        ref.read(socketListenerProvider);
        if (prev?.user == null) {
          CallPermissions.requestNotificationOnLogin();
        }
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
///
/// All platforms use the same in-place rendering — desktop multi-window is
/// disabled because the `desktop_multi_window` plugin loops IPC back to the
/// sender on Flutter 3.27+ macOS instead of routing to the target engine.
class _CallLayer extends ConsumerWidget {
  final Widget child;
  const _CallLayer({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(callProvider.select((s) => s.mode));
    final expanded = ref.watch(callProvider.select((s) => s.expanded));
    final inCall = mode == CallMode.outgoing || mode == CallMode.active;
    final isIncoming = mode == CallMode.incoming;
    final fullScreen = inCall && expanded;

    // Nothing to overlay — return route content as-is so we don't introduce
    // an Overlay that would interfere with the Navigator's overlay tree.
    if (!inCall && !isIncoming) return child;

    return Stack(
      children: [
        Offstage(offstage: fullScreen, child: child),
        Positioned.fill(
          child: Navigator(
            key: ValueKey('call-overlay-${inCall ? 1 : 0}-${isIncoming ? 1 : 0}'),
            onGenerateRoute: (_) => PageRouteBuilder(
              opaque: false,
              barrierColor: Colors.transparent,
              pageBuilder: (_, __, ___) => Stack(
                children: [
                  if (inCall) const Positioned.fill(child: CallScreen()),
                  if (isIncoming)
                    const Positioned.fill(child: IncomingCallOverlay()),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
