import 'package:json_annotation/json_annotation.dart';

part 'requests.g.dart';

@JsonSerializable()
class LoginRequest {
  final String email;
  final String password;

  LoginRequest({required this.email, required this.password});

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);
  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);
}

@JsonSerializable(includeIfNull: false)
class RegisterRequest {
  final String username;
  final String email;
  final String password;
  @JsonKey(name: 'full_name')
  final String? fullName;

  RegisterRequest({
    required this.username,
    required this.email,
    required this.password,
    this.fullName,
  });

  factory RegisterRequest.fromJson(Map<String, dynamic> json) =>
      _$RegisterRequestFromJson(json);
  Map<String, dynamic> toJson() => _$RegisterRequestToJson(this);
}

@JsonSerializable(includeIfNull: false)
class SendMessageRequest {
  final String conversationId;
  final String content;
  final String type;
  final String? clientMsgId;

  SendMessageRequest({
    required this.conversationId,
    required this.content,
    this.type = 'text',
    this.clientMsgId,
  });

  factory SendMessageRequest.fromJson(Map<String, dynamic> json) =>
      _$SendMessageRequestFromJson(json);
  Map<String, dynamic> toJson() => _$SendMessageRequestToJson(this);
}

@JsonSerializable(includeIfNull: false)
class SendDirectMessageRequest {
  final String recipientId;
  final String content;
  final String type;
  final String? clientMsgId;

  SendDirectMessageRequest({
    required this.recipientId,
    required this.content,
    this.type = 'text',
    this.clientMsgId,
  });

  factory SendDirectMessageRequest.fromJson(Map<String, dynamic> json) =>
      _$SendDirectMessageRequestFromJson(json);
  Map<String, dynamic> toJson() => _$SendDirectMessageRequestToJson(this);
}

@JsonSerializable()
class UpdateMessageRequest {
  final String content;

  UpdateMessageRequest({required this.content});

  factory UpdateMessageRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateMessageRequestFromJson(json);
  Map<String, dynamic> toJson() => _$UpdateMessageRequestToJson(this);
}

@JsonSerializable()
class CreateDirectConversationRequest {
  final String recipientId;

  CreateDirectConversationRequest({required this.recipientId});

  factory CreateDirectConversationRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateDirectConversationRequestFromJson(json);
  Map<String, dynamic> toJson() =>
      _$CreateDirectConversationRequestToJson(this);
}

@JsonSerializable()
class CreateGroupConversationRequest {
  final String name;
  final List<String> participantIds;

  CreateGroupConversationRequest({
    required this.name,
    required this.participantIds,
  });

  factory CreateGroupConversationRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateGroupConversationRequestFromJson(json);
  Map<String, dynamic> toJson() => _$CreateGroupConversationRequestToJson(this);
}
