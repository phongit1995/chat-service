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

@JsonSerializable(includeIfNull: false)
class UpdateProfileRequest {
  final String? avatar;
  final String? phone;
  final String? fullName;
  final String? bio;
  final String? dateOfBirth;

  UpdateProfileRequest({
    this.avatar,
    this.phone,
    this.fullName,
    this.bio,
    this.dateOfBirth,
  });

  factory UpdateProfileRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateProfileRequestFromJson(json);
  Map<String, dynamic> toJson() => _$UpdateProfileRequestToJson(this);
}

@JsonSerializable()
class ChangePasswordRequest {
  final String currentPassword;
  final String newPassword;

  ChangePasswordRequest({
    required this.currentPassword,
    required this.newPassword,
  });

  factory ChangePasswordRequest.fromJson(Map<String, dynamic> json) =>
      _$ChangePasswordRequestFromJson(json);
  Map<String, dynamic> toJson() => _$ChangePasswordRequestToJson(this);
}

@JsonSerializable()
class RefreshTokenRequest {
  final String refreshToken;

  RefreshTokenRequest({required this.refreshToken});

  factory RefreshTokenRequest.fromJson(Map<String, dynamic> json) =>
      _$RefreshTokenRequestFromJson(json);
  Map<String, dynamic> toJson() => _$RefreshTokenRequestToJson(this);
}

@JsonSerializable()
class PresenceBatchRequest {
  final List<String> userIds;

  PresenceBatchRequest({required this.userIds});

  factory PresenceBatchRequest.fromJson(Map<String, dynamic> json) =>
      _$PresenceBatchRequestFromJson(json);
  Map<String, dynamic> toJson() => _$PresenceBatchRequestToJson(this);
}

@JsonSerializable()
class TypingRequest {
  final String conversationId;

  TypingRequest({required this.conversationId});

  factory TypingRequest.fromJson(Map<String, dynamic> json) =>
      _$TypingRequestFromJson(json);
  Map<String, dynamic> toJson() => _$TypingRequestToJson(this);
}
