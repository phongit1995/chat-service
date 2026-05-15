// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ws_events.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

WsEnvelope<T> _$WsEnvelopeFromJson<T>(
  Map<String, dynamic> json,
  T Function(Object? json) fromJsonT,
) =>
    WsEnvelope<T>(
      type: json['type'] as String,
      data: _$nullableGenericFromJson(json['data'], fromJsonT),
    );

T? _$nullableGenericFromJson<T>(
  Object? input,
  T Function(Object? json) fromJson,
) =>
    input == null ? null : fromJson(input);

NewMessagePayload _$NewMessagePayloadFromJson(Map<String, dynamic> json) =>
    NewMessagePayload(
      message: Message.fromJson(json['message'] as Map<String, dynamic>),
      conversation: json['conversation'] == null
          ? null
          : Conversation.fromJson(json['conversation'] as Map<String, dynamic>),
    );

MessageDeletedPayload _$MessageDeletedPayloadFromJson(
        Map<String, dynamic> json) =>
    MessageDeletedPayload(
      messageId: json['messageId'] as String,
      conversation: json['conversation'] == null
          ? null
          : Conversation.fromJson(json['conversation'] as Map<String, dynamic>),
    );

ConversationUpdatedPayload _$ConversationUpdatedPayloadFromJson(
        Map<String, dynamic> json) =>
    ConversationUpdatedPayload(
      id: json['id'] as String,
      seen: json['seen'] as bool?,
      unreadCount: (json['unreadCount'] as num?)?.toInt(),
    );

ConversationDeletedPayload _$ConversationDeletedPayloadFromJson(
        Map<String, dynamic> json) =>
    ConversationDeletedPayload(
      conversationId: json['conversationId'] as String,
    );

TypingPayload _$TypingPayloadFromJson(Map<String, dynamic> json) =>
    TypingPayload(
      conversationId: json['conversationId'] as String,
      userId: json['userId'] as String,
      username: json['username'] as String?,
      time: json['time'] as String?,
    );

IncomingCallPayload _$IncomingCallPayloadFromJson(Map<String, dynamic> json) =>
    IncomingCallPayload(
      callId: json['callId'] as String,
      conversationId: json['conversationId'] as String,
      callerId: json['callerId'] as String,
      callType: json['callType'] as String,
      roomName: json['roomName'] as String,
      startedAt: json['startedAt'] as String,
    );

CallAcceptedPayload _$CallAcceptedPayloadFromJson(Map<String, dynamic> json) =>
    CallAcceptedPayload(
      callId: json['callId'] as String,
      conversationId: json['conversationId'] as String,
      answeredBy: json['answeredBy'] as String,
    );

CallDeclinedPayload _$CallDeclinedPayloadFromJson(Map<String, dynamic> json) =>
    CallDeclinedPayload(
      callId: json['callId'] as String,
      conversationId: json['conversationId'] as String,
      declinedBy: json['declinedBy'] as String,
    );

CallEndedPayload _$CallEndedPayloadFromJson(Map<String, dynamic> json) =>
    CallEndedPayload(
      callId: json['callId'] as String,
      conversationId: json['conversationId'] as String,
      endedBy: json['endedBy'] as String?,
      status: json['status'] as String,
      durationSeconds: (json['durationSeconds'] as num).toInt(),
    );
