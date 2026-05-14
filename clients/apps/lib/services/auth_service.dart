import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../models/requests.dart';
import '../network/auth_api_client.dart';

class AuthService {
  static const _tokenKey = 'accessToken';
  final AuthApiClient _client;

  AuthService(this._client);

  Future<LoginResult> login(String email, String password) async {
    final res = await _client.login(
      LoginRequest(email: email, password: password),
    );
    final data = res.data.data!;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, data.token);
    return LoginResult(token: data.token, user: data.user);
  }

  Future<void> register(
    String username,
    String email,
    String password,
    String? fullName,
  ) async {
    await _client.register(
      RegisterRequest(
        username: username,
        email: email,
        password: password,
        fullName: (fullName != null && fullName.isNotEmpty) ? fullName : null,
      ),
    );
  }

  Future<void> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    await _client.changePassword(
      ChangePasswordRequest(
        currentPassword: currentPassword,
        newPassword: newPassword,
      ),
    );
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }
}

class LoginResult {
  final String token;
  final User user;
  LoginResult({required this.token, required this.user});
}
