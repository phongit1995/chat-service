import 'package:dio/dio.dart';
import '../models/models.dart';
import '../models/requests.dart';
import '../models/responses.dart';
import '../network/user_api_client.dart';

class UserService {
  final UserApiClient _client;
  final Dio _dio;

  UserService(this._client, this._dio);

  Future<User> getProfile() async {
    final res = await _client.getProfile();
    return res.data.data!;
  }

  Future<UserPublicProfile> getUserInfo(String userId) async {
    final res = await _client.getUserInfo(userId);
    return res.data.data!;
  }

  Future<List<UserSearchResult>> searchUsers(String query) async {
    final res = await _client.searchUsers(query);
    return res.data.data?.users ?? [];
  }

  Future<User> updateProfile(UpdateProfileRequest request) async {
    final res = await _client.updateProfile(request);
    return res.data.data!;
  }

  Future<UploadAvatarResponse> uploadAvatar(String filePath) async {
    final fileName = filePath.split(RegExp(r'[/\\]')).last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
    });
    final res = await _dio.post<Map<String, dynamic>>(
      '/user/upload',
      data: formData,
    );
    final body = res.data!;
    final data = body['data'] as Map<String, dynamic>;
    return UploadAvatarResponse.fromJson(data);
  }
}
