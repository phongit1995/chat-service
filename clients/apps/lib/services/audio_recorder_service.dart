import 'dart:async';
import 'dart:io';

import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class RecordedAudio {
  final File file;
  final double duration;
  final List<double> waveform;
  RecordedAudio({required this.file, required this.duration, required this.waveform});
}

class AudioRecorderService {
  static const int waveformSamples = 40;
  static const int maxDurationSeconds = 300;

  final AudioRecorder _recorder = AudioRecorder();
  StreamSubscription<Amplitude>? _ampSub;
  String? _path;
  DateTime? _startedAt;
  final List<double> _levels = [];

  bool get isRecording => _path != null;

  final _levelsStreamController = StreamController<List<double>>.broadcast();
  final _elapsedController = StreamController<Duration>.broadcast();
  Timer? _elapsedTimer;

  Stream<List<double>> get levelsStream => _levelsStreamController.stream;
  Stream<Duration> get elapsedStream => _elapsedController.stream;

  Future<bool> hasPermission() => _recorder.hasPermission();

  Future<void> start() async {
    if (isRecording) return;
    if (!await _recorder.hasPermission()) {
      throw Exception('Microphone permission denied');
    }
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        bitRate: 64000,
        sampleRate: 44100,
        numChannels: 1,
      ),
      path: path,
    );
    _path = path;
    _startedAt = DateTime.now();
    _levels.clear();

    _ampSub = _recorder
        .onAmplitudeChanged(const Duration(milliseconds: 80))
        .listen((amp) {
      final db = amp.current;
      final norm = ((db + 45.0) / 45.0).clamp(0.0, 1.0);
      _levels.add(norm);
      if (_levels.length > waveformSamples * 4) _levels.removeAt(0);
      final tail = _levels.length >= waveformSamples
          ? _levels.sublist(_levels.length - waveformSamples)
          : <double>[
              ...List.filled(waveformSamples - _levels.length, 0.0),
              ..._levels,
            ];
      _levelsStreamController.add(tail);
    });

    _elapsedTimer = Timer.periodic(const Duration(milliseconds: 200), (_) {
      final started = _startedAt;
      if (started == null) return;
      final d = DateTime.now().difference(started);
      _elapsedController.add(d);
      if (d.inSeconds >= maxDurationSeconds) {
        stop().catchError((_) => null);
      }
    });
  }

  Future<RecordedAudio?> stop() async {
    final path = _path;
    final started = _startedAt;
    _ampSub?.cancel();
    _ampSub = null;
    _elapsedTimer?.cancel();
    _elapsedTimer = null;
    _path = null;
    _startedAt = null;
    if (path == null || started == null) return null;
    final stoppedPath = await _recorder.stop();
    final duration = DateTime.now().difference(started).inMilliseconds / 1000.0;
    final waveform = _downsample(List<double>.from(_levels), waveformSamples);
    final file = File(stoppedPath ?? path);
    return RecordedAudio(file: file, duration: duration, waveform: waveform);
  }

  Future<void> cancel() async {
    final path = _path;
    _ampSub?.cancel();
    _ampSub = null;
    _elapsedTimer?.cancel();
    _elapsedTimer = null;
    _path = null;
    _startedAt = null;
    if (path != null) {
      await _recorder.stop().catchError((_) => null);
      final f = File(path);
      if (await f.exists()) {
        await f.delete().catchError((_) => f);
      }
    }
  }

  Future<void> dispose() async {
    await _ampSub?.cancel();
    _elapsedTimer?.cancel();
    await _recorder.dispose();
    await _levelsStreamController.close();
    await _elapsedController.close();
  }

  static List<double> _downsample(List<double> input, int target) {
    if (input.isEmpty) return List.filled(target, 0.0);
    if (input.length <= target) {
      return [
        ...List.filled(target - input.length, 0.0),
        ...input,
      ];
    }
    final out = <double>[];
    final bucket = input.length / target;
    for (var i = 0; i < target; i++) {
      final s = (i * bucket).floor();
      final e = ((i + 1) * bucket).floor();
      var sum = 0.0;
      for (var j = s; j < e; j++) {
        sum += input[j];
      }
      out.add(sum / (e - s).clamp(1, 9999));
    }
    return out;
  }
}
