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
