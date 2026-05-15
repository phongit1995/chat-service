// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'call.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CallTokenResponse _$CallTokenResponseFromJson(Map<String, dynamic> json) =>
    CallTokenResponse(
      callId: json['callId'] as String,
      roomName: json['roomName'] as String,
      token: json['token'] as String,
      wsUrl: json['wsUrl'] as String,
      conversationId: json['conversationId'] as String,
      callerId: json['callerId'] as String,
      callType: $enumDecode(_$CallTypeEnumMap, json['callType']),
      status: $enumDecode(_$CallStatusEnumMap, json['status']),
      startedAt: json['startedAt'] as String,
    );

const _$CallTypeEnumMap = {
  CallType.audio: 'audio',
  CallType.video: 'video',
};

const _$CallStatusEnumMap = {
  CallStatus.ringing: 'ringing',
  CallStatus.active: 'active',
  CallStatus.ended: 'ended',
  CallStatus.missed: 'missed',
  CallStatus.declined: 'declined',
};
