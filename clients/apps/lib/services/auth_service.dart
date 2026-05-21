import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../models/requests.dart';
import '../models/responses.dart';
import '../network/auth_api_client.dart';

class AuthService {
  static const _tokenKey = 'accessToken';
  static const _refreshTokenKey = 'refreshToken';
  final AuthApiClient _client;

  AuthService(this._client);

  Future<LoginResult> login(String email, String password) async {
    final res = await _client.login(
      LoginRequest(email: email, password: password),
    );
    final data = res.data.data!;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, data.token);
    await prefs.setString(_refreshTokenKey, data.refreshToken);
    return LoginResult(
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.user,
    );
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

  Future<RefreshTokenData?> refresh(String refreshToken) async {
    final res = await _client.refresh(
      RefreshTokenRequest(refreshToken: refreshToken),
    );
    final data = res.data.data;
    if (data == null) return null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, data.token);
    await prefs.setString(_refreshTokenKey, data.refreshToken);
    return data;
  }

  Future<void> logout() async {
    try {
      await _client.logout();
    } catch (_) {
      // best-effort: ignore network errors so local state still clears
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }
}

class LoginResult {
  final String token;
  final String refreshToken;
  final User user;
  LoginResult({
    required this.token,
    required this.refreshToken,
    required this.user,
  });
}
