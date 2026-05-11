import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/api_service.dart';
import '../services/socket_service.dart';

final apiProvider = Provider<ApiService>((ref) => ApiService());

final socketProvider = Provider<SocketService>((ref) {
  final socket = SocketService();
  ref.onDispose(socket.dispose);
  return socket;
});
