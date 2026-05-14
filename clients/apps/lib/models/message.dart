import 'package:json_annotation/json_annotation.dart';

part 'message.g.dart';

@JsonSerializable()
class Message {
  final String id;
  final String conversationId;
  final String senderId;
  final String? senderName;
  final String? senderAvatar;
  @JsonKey(defaultValue: '')
  final String content;
  @JsonKey(defaultValue: 'text')
  final String type;
  @JsonKey(defaultValue: 'sent')
  final String status;
  @JsonKey(defaultValue: '')
  final String createdAt;
  final String? clientMsgId;

  Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    this.senderName,
    this.senderAvatar,
    required this.content,
    this.type = 'text',
    this.status = 'sent',
    required this.createdAt,
    this.clientMsgId,
  });

  Message copyWith({String? status, String? id}) => Message(
    id: id ?? this.id,
    conversationId: conversationId,
    senderId: senderId,
    senderName: senderName,
    senderAvatar: senderAvatar,
    content: content,
    type: type,
    status: status ?? this.status,
    createdAt: createdAt,
    clientMsgId: clientMsgId,
  );

  factory Message.fromJson(Map<String, dynamic> json) => _$MessageFromJson(json);
  Map<String, dynamic> toJson() => _$MessageToJson(this);
}
