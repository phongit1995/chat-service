import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/audio_playback_service.dart';
import '../services/audio_recorder_service.dart';

final audioRecorderProvider = Provider<AudioRecorderService>((ref) {
  final svc = AudioRecorderService();
  ref.onDispose(() => svc.dispose());
  return svc;
});

final audioPlaybackProvider = Provider<AudioPlaybackService>((ref) {
  final svc = AudioPlaybackService();
  ref.onDispose(() => svc.dispose());
  return svc;
});

final currentPlayingAudioProvider = StreamProvider<String?>((ref) {
  return ref.watch(audioPlaybackProvider).currentIdStream;
});

const _speedKey = 'audio_playback_speed';

class AudioSpeedNotifier extends Notifier<double> {
  static const _allowed = [1.0, 1.5, 2.0];

  @override
  double build() {
    _load();
    return 1.0;
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final v = prefs.getDouble(_speedKey);
    if (v != null && _allowed.contains(v)) state = v;
  }

  Future<void> cycle() async {
    final idx = _allowed.indexOf(state);
    final next = _allowed[(idx + 1) % _allowed.length];
    state = next;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_speedKey, next);
    await ref.read(audioPlaybackProvider).setSpeed(next);
  }
}

final audioSpeedProvider =
    NotifierProvider<AudioSpeedNotifier, double>(AudioSpeedNotifier.new);
