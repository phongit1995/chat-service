import 'dart:async';
// ignore: library_prefixes
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/env.dart';
import '../models/models.dart';

class NewMessageEvent {
  final Message message;
  final Conversation? conversation;
  NewMessageEvent(this.message, this.conversation);
}

class SocketService {
  IO.Socket? _socket;

  final _newMessageCtrl = StreamController<NewMessageEvent>.broadcast();
  final _conversationCreatedCtrl = StreamController<String>.broadcast();
  final _conversationUpdatedCtrl = StreamController<Map<String, dynamic>>.broadcast();
  final _conversationDeletedCtrl = StreamController<String>.broadcast();

  Stream<NewMessageEvent> get onNewMessage => _newMessageCtrl.stream;
  Stream<String> get onConversationCreated => _conversationCreatedCtrl.stream;
  Stream<Map<String, dynamic>> get onConversationUpdated => _conversationUpdatedCtrl.stream;
  Stream<String> get onConversationDeleted => _conversationDeletedCtrl.stream;

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

    _socket!.on('message', (raw) {
      try {
        if (raw is! Map) return;
        final wrapper = Map<String, dynamic>.from(raw);
        final type = wrapper['type'] as String?;
        final data = wrapper['data'];
        if (type == null || data is! Map) return;
        final payload = Map<String, dynamic>.from(data);

        switch (type) {
          case 'NEW_MESSAGE':
            final msgRaw = payload['message'];
            final convRaw = payload['conversation'];
            if (msgRaw is Map) {
              final message = Message.fromJson(Map<String, dynamic>.from(msgRaw));
              Conversation? conv;
              if (convRaw is Map) {
                conv = Conversation.fromJson(Map<String, dynamic>.from(convRaw));
              }
              _newMessageCtrl.add(NewMessageEvent(message, conv));
            }
            break;
          case 'CONVERSATION_CREATED':
            final id = payload['id'] as String?;
            if (id != null) _conversationCreatedCtrl.add(id);
            break;
          case 'CONVERSATION_UPDATED':
            _conversationUpdatedCtrl.add(payload);
            break;
          case 'CONVERSATION_DELETED':
            final id = payload['conversationId'] as String?;
            if (id != null) _conversationDeletedCtrl.add(id);
            break;
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
    _conversationCreatedCtrl.close();
    _conversationUpdatedCtrl.close();
    _conversationDeletedCtrl.close();
  }
}
