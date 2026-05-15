import 'package:json_annotation/json_annotation.dart';
import 'models.dart';

part 'ws_events.g.dart';

class WsClientEvent {
  static const ping = 'ping';
}

class WsEventType {
  static const newMessage = 'NEW_MESSAGE';
  static const messageUpdated = 'MESSAGE_UPDATED';
  static const messageDeleted = 'MESSAGE_DELETED';
  static const conversationCreated = 'CONVERSATION_CREATED';
  static const conversationUpdated = 'CONVERSATION_UPDATED';
  static const conversationDeleted = 'CONVERSATION_DELETED';
  static const userTyping = 'USER_TYPING';
  static const userStopTyping = 'USER_STOP_TYPING';
  static const incomingCall = 'INCOMING_CALL';
  static const callAccepted = 'CALL_ACCEPTED';
  static const callDeclined = 'CALL_DECLINED';
  static const callEnded = 'CALL_ENDED';
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

@JsonSerializable(createToJson: false)
class IncomingCallPayload {
  final String callId;
  final String conversationId;
  final String callerId;
  final String callType;
  final String roomName;
  final String startedAt;

  IncomingCallPayload({
    required this.callId,
    required this.conversationId,
    required this.callerId,
    required this.callType,
    required this.roomName,
    required this.startedAt,
  });

  factory IncomingCallPayload.fromJson(Map<String, dynamic> json) =>
      _$IncomingCallPayloadFromJson(json);
}

@JsonSerializable(createToJson: false)
class CallAcceptedPayload {
  final String callId;
  final String conversationId;
  final String answeredBy;

  CallAcceptedPayload({
    required this.callId,
    required this.conversationId,
    required this.answeredBy,
  });

  factory CallAcceptedPayload.fromJson(Map<String, dynamic> json) =>
      _$CallAcceptedPayloadFromJson(json);
}

@JsonSerializable(createToJson: false)
class CallDeclinedPayload {
  final String callId;
  final String conversationId;
  final String declinedBy;

  CallDeclinedPayload({
    required this.callId,
    required this.conversationId,
    required this.declinedBy,
  });

  factory CallDeclinedPayload.fromJson(Map<String, dynamic> json) =>
      _$CallDeclinedPayloadFromJson(json);
}

@JsonSerializable(createToJson: false)
class CallEndedPayload {
  final String callId;
  final String conversationId;
  final String? endedBy;
  final String status;
  final int durationSeconds;

  CallEndedPayload({
    required this.callId,
    required this.conversationId,
    this.endedBy,
    required this.status,
    required this.durationSeconds,
  });

  factory CallEndedPayload.fromJson(Map<String, dynamic> json) =>
      _$CallEndedPayloadFromJson(json);
}
