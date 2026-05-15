import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/call.dart';
import '../models/responses.dart';

part 'call_api_client.g.dart';

class StartCallBody {
  final String conversationId;
  final String callType;
  StartCallBody({required this.conversationId, required this.callType});
  Map<String, dynamic> toJson() => {
        'conversationId': conversationId,
        'callType': callType,
      };
}

@RestApi()
abstract class CallApiClient {
  factory CallApiClient(Dio dio, {String baseUrl}) = _CallApiClient;

  @POST('/calls/start')
  Future<HttpResponse<ApiResponse<CallTokenResponse>>> startCall(
    @Body() StartCallBody body,
  );

  @POST('/calls/{id}/answer')
  Future<HttpResponse<ApiResponse<CallTokenResponse>>> answerCall(
    @Path('id') String callId,
  );

  @POST('/calls/{id}/decline')
  Future<HttpResponse<ApiResponse<dynamic>>> declineCall(
    @Path('id') String callId,
  );

  @POST('/calls/{id}/end')
  Future<HttpResponse<ApiResponse<dynamic>>> endCall(
    @Path('id') String callId,
  );
}
