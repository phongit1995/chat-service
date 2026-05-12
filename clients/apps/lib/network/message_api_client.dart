import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/models.dart';
import '../models/requests.dart';
import '../models/responses.dart';

part 'message_api_client.g.dart';

@RestApi()
abstract class MessageApiClient {
  factory MessageApiClient(Dio dio, {String baseUrl}) = _MessageApiClient;

  @GET('/messages/{conversationId}')
  Future<HttpResponse<ApiResponse<MessagesResponse>>> getMessages(
    @Path('conversationId') String conversationId, {
    @Query('limit') int limit = 50,
  });

  @POST('/messages')
  Future<HttpResponse<ApiResponse<Message>>> sendMessage(
    @Body() SendMessageRequest body,
  );

  @POST('/messages/direct')
  Future<HttpResponse<ApiResponse<Message>>> sendDirectMessage(
    @Body() SendDirectMessageRequest body,
  );

  @PATCH('/messages/{conversationId}/{messageId}')
  Future<HttpResponse<ApiResponse<Message>>> updateMessage(
    @Path('conversationId') String conversationId,
    @Path('messageId') String messageId,
    @Body() UpdateMessageRequest body,
  );

  @DELETE('/messages/{conversationId}/{messageId}')
  Future<HttpResponse<ApiResponse<dynamic>>> deleteMessage(
    @Path('conversationId') String conversationId,
    @Path('messageId') String messageId,
  );
}
