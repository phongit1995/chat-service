import 'dart:async';
// ignore: library_prefixes
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/env.dart';
import '../models/models.dart';
import '../models/ws_events.dart';

class NewMessageEvent {
  final Message message;
  final Conversation? conversation;
  NewMessageEvent(this.message, this.conversation);
}

class SocketService {
  IO.Socket? _socket;
  Timer? _pingTimer;

  final _newMessageCtrl = StreamController<NewMessageEvent>.broadcast();
  final _messageUpdatedCtrl = StreamController<NewMessageEvent>.broadcast();
  final _messageDeletedCtrl =
      StreamController<MessageDeletedPayload>.broadcast();
  final _conversationCreatedCtrl = StreamController<String>.broadcast();
  final _conversationUpdatedCtrl =
      StreamController<ConversationUpdatedPayload>.broadcast();
  final _conversationDeletedCtrl = StreamController<String>.broadcast();
  final _typingCtrl = StreamController<TypingPayload>.broadcast();
  final _stopTypingCtrl = StreamController<TypingPayload>.broadcast();

  Stream<NewMessageEvent> get onNewMessage => _newMessageCtrl.stream;
  Stream<NewMessageEvent> get onMessageUpdated => _messageUpdatedCtrl.stream;
  Stream<MessageDeletedPayload> get onMessageDeleted =>
      _messageDeletedCtrl.stream;
  Stream<String> get onConversationCreated => _conversationCreatedCtrl.stream;
  Stream<ConversationUpdatedPayload> get onConversationUpdated =>
      _conversationUpdatedCtrl.stream;
  Stream<String> get onConversationDeleted => _conversationDeletedCtrl.stream;
  Stream<TypingPayload> get onUserTyping => _typingCtrl.stream;
  Stream<TypingPayload> get onUserStopTyping => _stopTypingCtrl.stream;

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
        _dispatch(type, payload);
      } catch (_) {}
    });

    _socket!.connect();

    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (_socket?.connected == true) {
        _socket!.emit(WsClientEvent.ping);
      }
    });
  }

  void _dispatch(String type, Map<String, dynamic> payload) {
    switch (type) {
      case WsEventType.newMessage:
        final p = NewMessagePayload.fromJson(payload);
        _newMessageCtrl.add(NewMessageEvent(p.message, p.conversation));
        break;
      case WsEventType.messageUpdated:
        final p = NewMessagePayload.fromJson(payload);
        _messageUpdatedCtrl.add(NewMessageEvent(p.message, p.conversation));
        break;
      case WsEventType.messageDeleted:
        _messageDeletedCtrl.add(MessageDeletedPayload.fromJson(payload));
        break;
      case WsEventType.conversationCreated:
        final id = payload['id'] as String?;
        if (id != null) _conversationCreatedCtrl.add(id);
        break;
      case WsEventType.conversationUpdated:
        _conversationUpdatedCtrl.add(
          ConversationUpdatedPayload.fromJson(payload),
        );
        break;
      case WsEventType.conversationDeleted:
        final id = payload['conversationId'] as String?;
        if (id != null) _conversationDeletedCtrl.add(id);
        break;
      case WsEventType.userTyping:
        _typingCtrl.add(TypingPayload.fromJson(payload));
        break;
      case WsEventType.userStopTyping:
        _stopTypingCtrl.add(TypingPayload.fromJson(payload));
        break;
    }
  }

  void emitTyping(String conversationId) {
    _socket?.emit('typing', {'conversationId': conversationId});
  }

  void emitStopTyping(String conversationId) {
    _socket?.emit('stop_typing', {'conversationId': conversationId});
  }

  void disconnect() {
    _pingTimer?.cancel();
    _pingTimer = null;
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _newMessageCtrl.close();
    _messageUpdatedCtrl.close();
    _messageDeletedCtrl.close();
    _conversationCreatedCtrl.close();
    _conversationUpdatedCtrl.close();
    _conversationDeletedCtrl.close();
    _typingCtrl.close();
    _stopTypingCtrl.close();
  }
}
