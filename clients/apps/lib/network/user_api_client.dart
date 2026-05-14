import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/models.dart';
import '../models/requests.dart';
import '../models/responses.dart';

part 'user_api_client.g.dart';

@RestApi()
abstract class UserApiClient {
  factory UserApiClient(Dio dio, {String baseUrl}) = _UserApiClient;

  @GET('/user/me')
  Future<HttpResponse<ApiResponse<User>>> getProfile();

  @GET('/user/search')
  Future<HttpResponse<ApiResponse<UsersResponse>>> searchUsers(
    @Query('q') String query, {
    @Query('limit') int limit = 20,
  });

  @PUT('/user/me')
  Future<HttpResponse<ApiResponse<User>>> updateProfile(
    @Body() UpdateProfileRequest request,
  );
}
