import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/env.dart';

Dio createDio() {
  final dio = Dio(
    BaseOptions(
      baseUrl: '${Env.apiBaseUrl}/api',
      headers: {'Content-Type': 'application/json'},
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        final data = e.response?.data;
        if (data is Map<String, dynamic>) {
          final apiMessage = data['error'];
          if (apiMessage is String && apiMessage.isNotEmpty) {
            return handler.reject(
              DioException(
                requestOptions: e.requestOptions,
                response: e.response,
                type: e.type,
                error: e.error,
                message: apiMessage,
              ),
            );
          }
        }
        return handler.next(e);
      },
    ),
  );

  return dio;
}
