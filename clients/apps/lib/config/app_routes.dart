enum AppRoute {
  splash('/splash'),
  login('/login'),
  register('/register'),
  home('/'),
  chat('/chat/:id');

  final String path;
  const AppRoute(this.path);

  String chatPath(String id) {
    if (this != AppRoute.chat) {
      throw StateError('chatPath only valid for AppRoute.chat');
    }
    return '/chat/$id';
  }

  static bool isAuthRoute(String location) =>
      location == AppRoute.login.path || location == AppRoute.register.path;

  static bool isSplash(String location) => location == AppRoute.splash.path;
}
