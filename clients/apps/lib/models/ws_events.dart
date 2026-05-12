import 'package:json_annotation/json_annotation.dart';
import 'models.dart';

part 'ws_events.g.dart';

class WsEventType {
  static const newMessage = 'NEW_MESSAGE';
  static const messageUpdated = 'MESSAGE_UPDATED';
  static const messageDeleted = 'MESSAGE_DELETED';
  static const conversationCreated = 'CONVERSATION_CREATED';
  static const conversationUpdated = 'CONVERSATION_UPDATED';
  static const conversationDeleted = 'CONVERSATION_DELETED';
  static const userTyping = 'USER_TYPING';
  static const userStopTyping = 'USER_STOP_TYPING';
  static const error = 'ERROR';
}

@JsonSerializable(genericArgumentFactories: true, createToJson: false)
class WsEnvelope<T> {
  final String type;
  final T? data;

  WsEnvelope({required this.type, this.data});

  factory WsEnvelope.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) => _$WsEnvelopeFromJson(json, fromJsonT);
}

@JsonSerializable(createToJson: false)
class NewMessagePayload {
  final Message message;
  final Conversation? conversation;

  NewMessagePayload({required this.message, this.conversation});

  factory NewMessagePayload.fromJson(Map<String, dynamic> json) =>
      _$NewMessagePayloadFromJson(json);
}

@JsonSerializable(createToJson: false)
class MessageDeletedPayload {
  final String messageId;
  final Conversation? conversation;

  MessageDeletedPayload({required this.messageId, this.conversation});

  factory MessageDeletedPayload.fromJson(Map<String, dynamic> json) =>
      _$MessageDeletedPayloadFromJson(json);
}

@JsonSerializable(createToJson: false)
class ConversationUpdatedPayload {
  final String id;
  final bool? seen;
  @JsonKey(name: 'unreadCount')
  final int? unreadCount;

  ConversationUpdatedPayload({required this.id, this.seen, this.unreadCount});

  factory ConversationUpdatedPayload.fromJson(Map<String, dynamic> json) =>
      _$ConversationUpdatedPayloadFromJson(json);
}

@JsonSerializable(createToJson: false)
class ConversationDeletedPayload {
  final String conversationId;

  ConversationDeletedPayload({required this.conversationId});

  factory ConversationDeletedPayload.fromJson(Map<String, dynamic> json) =>
      _$ConversationDeletedPayloadFromJson(json);
}

@JsonSerializable(createToJson: false)
class TypingPayload {
  final String conversationId;
  final String userId;
  final String? username;
  final String? time;

  TypingPayload({
    required this.conversationId,
    required this.userId,
    this.username,
    this.time,
  });

  factory TypingPayload.fromJson(Map<String, dynamic> json) =>
      _$TypingPayloadFromJson(json);
}
