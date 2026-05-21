import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/env.dart';

const _accessTokenKey = 'accessToken';
const _refreshTokenKey = 'refreshToken';
const _refreshPath = '/auth/refresh';
const _loginPath = '/auth/login';
const _registerPath = '/auth/register';
const _logoutPath = '/auth/logout';

Future<void> _clearTokens() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(_accessTokenKey);
  await prefs.remove(_refreshTokenKey);
}

Future<String?> _refreshAccessToken(Dio bareDio, String refreshToken) async {
  try {
    final res = await bareDio.post(
      '${Env.apiBaseUrl}/api$_refreshPath',
      data: {'refreshToken': refreshToken},
      options: Options(headers: {'Content-Type': 'application/json'}),
    );
    final data = res.data?['data'];
    if (data is Map<String, dynamic>) {
      final newAccess = data['token'];
      final newRefresh = data['refreshToken'];
      if (newAccess is String && newRefresh is String) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_accessTokenKey, newAccess);
        await prefs.setString(_refreshTokenKey, newRefresh);
        return newAccess;
      }
    }
  } catch (_) {}
  return null;
}

Dio createDio() {
  final dio = Dio(
    BaseOptions(
      baseUrl: '${Env.apiBaseUrl}/api',
      headers: {'Content-Type': 'application/json'},
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  // bare dio (no interceptors) used by the refresh call itself to avoid loops
  final bareDio = Dio(
    BaseOptions(connectTimeout: const Duration(seconds: 10)),
  );

  Future<String?>? refreshInFlight;

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString(_accessTokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        final status = e.response?.statusCode;
        final path = e.requestOptions.path;
        final retried = e.requestOptions.extra['_retried'] == true;

        final isAuthRoute = path.contains(_refreshPath) ||
            path.contains(_loginPath) ||
            path.contains(_registerPath) ||
            path.contains(_logoutPath);

        if (status == 401 && !retried && !isAuthRoute) {
          final prefs = await SharedPreferences.getInstance();
          final refreshToken = prefs.getString(_refreshTokenKey);
          if (refreshToken == null || refreshToken.isEmpty) {
            await _clearTokens();
            return _rejectWithApiMessage(e, handler);
          }

          refreshInFlight ??= _refreshAccessToken(bareDio, refreshToken);
          final newToken = await refreshInFlight;
          refreshInFlight = null;

          if (newToken == null) {
            await _clearTokens();
            return _rejectWithApiMessage(e, handler);
          }

          final retry = e.requestOptions;
          retry.headers['Authorization'] = 'Bearer $newToken';
          retry.extra['_retried'] = true;

          try {
            final response = await dio.fetch(retry);
            return handler.resolve(response);
          } catch (err) {
            if (err is DioException) return _rejectWithApiMessage(err, handler);
            rethrow;
          }
        }

        return _rejectWithApiMessage(e, handler);
      },
    ),
  );

  return dio;
}

void _rejectWithApiMessage(DioException e, ErrorInterceptorHandler handler) {
  final data = e.response?.data;
  if (data is Map<String, dynamic>) {
    final apiMessage = data['error'];
    if (apiMessage is String && apiMessage.isNotEmpty) {
      handler.reject(
        DioException(
          requestOptions: e.requestOptions,
          response: e.response,
          type: e.type,
          error: e.error,
          message: apiMessage,
        ),
      );
      return;
    }
  }
  handler.next(e);
}
