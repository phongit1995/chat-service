import 'dart:convert';
import 'package:desktop_multi_window/desktop_multi_window.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
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
import 'screens/call/call_window_app.dart';
import 'screens/call/incoming_call_overlay.dart';
import 'providers/call_provider.dart';
import 'theme/app_theme.dart';
import 'utils/toast.dart' show navigatorKey;

void main(List<String> args) {
  WidgetsFlutterBinding.ensureInitialized();

  // Sub-window entry: launched by DesktopMultiWindow.createWindow().
  // args == ['multi_window', '<windowId>', '<json args>']
  if (args.isNotEmpty && args.first == 'multi_window') {
    final windowId = int.parse(args[1]);
    final raw = args.length > 2 ? args[2] : '';
    final subArgs = raw.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(raw) as Map<String, dynamic>;
    final type = subArgs['type'] as String?;
    if (type == 'call') {
      runApp(CallWindowApp(
        windowController: WindowController.fromWindowId(windowId),
        args: subArgs,
      ));
      return;
    }
  }

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

bool get _isDesktopPlatform =>
    defaultTargetPlatform == TargetPlatform.windows ||
    defaultTargetPlatform == TargetPlatform.macOS ||
    defaultTargetPlatform == TargetPlatform.linux;

/// Layers the route content with the global call screen and the incoming
/// call overlay.
///
/// Desktop platforms render the in-call UI in a dedicated sub-window
/// (spawned by CallNotifier), so this layer skips the in-place [CallScreen]
/// there and only keeps the incoming-call overlay for ringing UI.
class _CallLayer extends ConsumerWidget {
  final Widget child;
  const _CallLayer({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(callProvider.select((s) => s.mode));
    final expanded = ref.watch(callProvider.select((s) => s.expanded));
    final inCall = mode == CallMode.outgoing || mode == CallMode.active;
    final useSubWindow = _isDesktopPlatform;
    final fullScreen = inCall && expanded && !useSubWindow;

    return Stack(
      children: [
        Offstage(offstage: fullScreen, child: child),
        if (inCall && !useSubWindow) const Positioned.fill(child: CallScreen()),
        // Desktop spawns a small sub-window for incoming ringing instead.
        if (!useSubWindow) const Positioned.fill(child: IncomingCallOverlay()),
      ],
    );
  }
}
