import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/auth_api_client.dart';
import '../network/conversation_api_client.dart';
import '../network/dio_factory.dart';
import '../network/message_api_client.dart';
import '../network/user_api_client.dart';
import '../services/auth_service.dart';
import '../services/conversation_service.dart';
import '../services/message_service.dart';
import '../services/socket_service.dart';
import '../services/user_service.dart';

final _dioProvider = Provider((ref) => createDio());

final authServiceProvider = Provider<AuthService>(
  (ref) => AuthService(AuthApiClient(ref.read(_dioProvider))),
);

final userServiceProvider = Provider<UserService>(
  (ref) => UserService(UserApiClient(ref.read(_dioProvider))),
);

final conversationServiceProvider = Provider<ConversationService>(
  (ref) => ConversationService(ConversationApiClient(ref.read(_dioProvider))),
);

final messageServiceProvider = Provider<MessageService>(
  (ref) => MessageService(MessageApiClient(ref.read(_dioProvider))),
);

final socketProvider = Provider<SocketService>((ref) {
  final socket = SocketService();
  ref.onDispose(socket.dispose);
  return socket;
});
