import 'package:json_annotation/json_annotation.dart';

part 'call.g.dart';

enum CallType {
  @JsonValue('audio')
  audio,
  @JsonValue('video')
  video,
}

enum CallStatus {
  @JsonValue('ringing')
  ringing,
  @JsonValue('active')
  active,
  @JsonValue('ended')
  ended,
  @JsonValue('missed')
  missed,
  @JsonValue('declined')
  declined,
}

@JsonSerializable(createToJson: false)
class CallTokenResponse {
  final String callId;
  final String roomName;
  final String token;
  final String wsUrl;
  final String conversationId;
  final String callerId;
  final CallType callType;
  final CallStatus status;
  final String startedAt;

  CallTokenResponse({
    required this.callId,
    required this.roomName,
    required this.token,
    required this.wsUrl,
    required this.conversationId,
    required this.callerId,
    required this.callType,
    required this.status,
    required this.startedAt,
  });

  factory CallTokenResponse.fromJson(Map<String, dynamic> json) =>
      _$CallTokenResponseFromJson(json);
}

class CallerBrief {
  final String id;
  final String? username;
  final String? fullName;
  final String? avatar;

  const CallerBrief({
    required this.id,
    this.username,
    this.fullName,
    this.avatar,
  });

  String get displayName =>
      (fullName != null && fullName!.isNotEmpty)
          ? fullName!
          : (username != null && username!.isNotEmpty ? username! : 'Unknown');
}
