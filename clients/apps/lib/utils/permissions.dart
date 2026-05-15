import 'dart:io';
import 'package:permission_handler/permission_handler.dart';

class CallPermissions {
  static Future<void> requestNotificationOnLogin() async {
    if (Platform.isAndroid || Platform.isIOS) {
      await Permission.notification.request();
    }
  }

  static Future<bool> requestCallMedia({required bool video}) async {
    if (!Platform.isAndroid && !Platform.isIOS) return true;
    final perms = <Permission>[
      Permission.microphone,
      if (video) Permission.camera,
    ];
    final results = await perms.request();
    return results.values.every((s) => s.isGranted);
  }
}
