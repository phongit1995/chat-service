import '../models/models.dart';
import '../network/user_api_client.dart';

class UserService {
  final UserApiClient _client;

  UserService(this._client);

  Future<User> getProfile() async {
    final res = await _client.getProfile();
    return res.data.data!;
  }

  Future<List<UserSearchResult>> searchUsers(String query) async {
    final res = await _client.searchUsers(query);
    return res.data.data?.users ?? [];
  }
}
