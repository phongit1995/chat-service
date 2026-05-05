import 'dart:async';
// ignore: library_prefixes
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/env.dart';
import '../models/models.dart';

class SocketService {
  IO.Socket? _socket;

  final _newMessageCtrl = StreamController<Message>.broadcast();
  final _conversationUpdatedCtrl = StreamController<Conversation>.broadcast();

  Stream<Message> get onNewMessage => _newMessageCtrl.stream;
  Stream<Conversation> get onConversationUpdated => _conversationUpdatedCtrl.stream;

  bool get isConnected => _socket?.connected ?? false;

  void connect(String token) {
    if (_socket != null) {
      _socket!.dispose();
    }
    _socket = IO.io(
      Env.wsBaseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    _socket!.on('NEW_MESSAGE', (data) {
      try {
        final payload = data is Map ? Map<String, dynamic>.from(data) : null;
        if (payload == null) return;
        final msgRaw = payload['message'];
        final convRaw = payload['conversation'];
        if (msgRaw is Map) {
          _newMessageCtrl.add(Message.fromJson(Map<String, dynamic>.from(msgRaw)));
        }
        if (convRaw is Map) {
          _conversationUpdatedCtrl.add(Conversation.fromJson(Map<String, dynamic>.from(convRaw)));
        }
      } catch (_) {}
    });

    _socket!.on('CONVERSATION_CREATED', (data) {
      try {
        if (data is Map) {
          _conversationUpdatedCtrl.add(Conversation.fromJson(Map<String, dynamic>.from(data)));
        }
      } catch (_) {}
    });

    _socket!.connect();
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _newMessageCtrl.close();
    _conversationUpdatedCtrl.close();
  }
}
