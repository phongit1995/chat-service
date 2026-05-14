import 'package:json_annotation/json_annotation.dart';

part 'user.g.dart';

@JsonSerializable()
class User {
  final String id;
  final String username;
  final String email;
  final String? fullName;
  final String? avatar;
  final String? avatarURL;
  final String? bio;
  final String? phone;
  @JsonKey(defaultValue: 'offline')
  final String status;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.fullName,
    this.avatar,
    this.avatarURL,
    this.bio,
    this.phone,
    this.status = 'offline',
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}

@JsonSerializable()
class UserSearchResult {
  final String id;
  final String username;
  final String? fullName;
  final String? avatar;
  final String? bio;
  @JsonKey(defaultValue: false)
  final bool isOnline;

  UserSearchResult({
    required this.id,
    required this.username,
    this.fullName,
    this.avatar,
    this.bio,
    this.isOnline = false,
  });

  factory UserSearchResult.fromJson(Map<String, dynamic> json) =>
      _$UserSearchResultFromJson(json);
  Map<String, dynamic> toJson() => _$UserSearchResultToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}

@JsonSerializable()
class UserPublicProfile {
  final String id;
  final String username;
  final String? fullName;
  final String? avatar;
  final String? bio;
  @JsonKey(defaultValue: false)
  final bool isOnline;
  final String? lastActiveAt;
  final String? createdAt;

  UserPublicProfile({
    required this.id,
    required this.username,
    this.fullName,
    this.avatar,
    this.bio,
    this.isOnline = false,
    this.lastActiveAt,
    this.createdAt,
  });

  factory UserPublicProfile.fromJson(Map<String, dynamic> json) =>
      _$UserPublicProfileFromJson(json);
  Map<String, dynamic> toJson() => _$UserPublicProfileToJson(this);

  String get displayName => fullName?.isNotEmpty == true ? fullName! : username;
}
