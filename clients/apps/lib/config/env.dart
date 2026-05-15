import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class Env {
  static const _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static const _liveKitUrl = String.fromEnvironment(
    'LIVEKIT_URL',
    defaultValue: '',
  );

  static String get apiBaseUrl {
    if (_apiBaseUrl.isNotEmpty) return _apiBaseUrl;
    if (kIsWeb) return 'http://localhost:8080';
    if (Platform.isAndroid) return 'http://10.0.2.2:8080';
    return 'http://localhost:8080';
  }

  static String get wsBaseUrl => apiBaseUrl;

  static String get liveKitUrl {
    if (_liveKitUrl.isNotEmpty) return _liveKitUrl;
    if (kIsWeb) return 'ws://localhost:7880';
    if (Platform.isAndroid) return 'ws://10.0.2.2:7880';
    return 'ws://localhost:7880';
  }
}
