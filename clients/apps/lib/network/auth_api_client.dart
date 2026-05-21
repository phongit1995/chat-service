import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/requests.dart';
import '../models/responses.dart';

part 'auth_api_client.g.dart';

@RestApi()
abstract class AuthApiClient {
  factory AuthApiClient(Dio dio, {String baseUrl}) = _AuthApiClient;

  @POST('/auth/login')
  Future<HttpResponse<ApiResponse<LoginData>>> login(
    @Body() LoginRequest body,
  );

  @POST('/auth/register')
  Future<HttpResponse<ApiResponse<dynamic>>> register(
    @Body() RegisterRequest body,
  );

  @POST('/auth/change-password')
  Future<HttpResponse<ApiResponse<dynamic>>> changePassword(
    @Body() ChangePasswordRequest body,
  );

  @POST('/auth/refresh')
  Future<HttpResponse<ApiResponse<RefreshTokenData>>> refresh(
    @Body() RefreshTokenRequest body,
  );

  @POST('/auth/logout')
  Future<HttpResponse<ApiResponse<dynamic>>> logout();
}
