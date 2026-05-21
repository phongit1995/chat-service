import 'package:json_annotation/json_annotation.dart';
import 'message_type.dart';

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
  final String? updatedAt;
  final String? editedAt;
  final String? clientMsgId;
  final String? metadata;
  final Map<String, List<String>>? reactions;

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
    this.updatedAt,
    this.editedAt,
    this.clientMsgId,
    this.metadata,
    this.reactions,
  });

  Message copyWith({
    String? status,
    String? id,
    String? content,
    String? type,
    String? metadata,
    String? updatedAt,
    String? editedAt,
    Map<String, List<String>>? reactions,
  }) => Message(
    id: id ?? this.id,
    conversationId: conversationId,
    senderId: senderId,
    senderName: senderName,
    senderAvatar: senderAvatar,
    content: content ?? this.content,
    type: type ?? this.type,
    status: status ?? this.status,
    createdAt: createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
    editedAt: editedAt ?? this.editedAt,
    clientMsgId: clientMsgId,
    metadata: metadata ?? this.metadata,
    reactions: reactions ?? this.reactions,
  );

  MessageType get messageType => MessageType.fromValue(type);
  bool get isText => messageType == MessageType.text;
  bool get isImage => messageType == MessageType.image;
  bool get isFile => messageType == MessageType.file;
  bool get isVideo => messageType == MessageType.video;
  bool get isAudio => messageType == MessageType.audio;

  bool get isEdited => (editedAt != null && editedAt!.isNotEmpty);

  factory Message.fromJson(Map<String, dynamic> json) => _$MessageFromJson(json);
  Map<String, dynamic> toJson() => _$MessageToJson(this);
}
