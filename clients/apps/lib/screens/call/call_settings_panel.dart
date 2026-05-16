import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';

import '../../providers/call_provider.dart';

class CallSettingsPanel extends ConsumerStatefulWidget {
  final Room? room;
  final VoidCallback onClose;
  const CallSettingsPanel({super.key, required this.room, required this.onClose});

  @override
  ConsumerState<CallSettingsPanel> createState() => _CallSettingsPanelState();
}

class _CallSettingsPanelState extends ConsumerState<CallSettingsPanel> {
  List<MediaDevice> _mics = [];
  List<MediaDevice> _cams = [];
  List<MediaDevice> _speakers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDevices();
  }

  Future<void> _loadDevices() async {
    try {
      final mics = await Hardware.instance.audioInputs();
      final cams = await Hardware.instance.videoInputs();
      final speakers = await Hardware.instance.audioOutputs();
      if (!mounted) return;
      setState(() {
        _mics = mics;
        _cams = cams;
        _speakers = speakers;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _selectMic(String deviceId) async {
    ref.read(callProvider.notifier).setSelectedMicId(deviceId);
    final device = _mics.firstWhere(
      (d) => d.deviceId == deviceId,
      orElse: () => _mics.first,
    );
    try {
      await Hardware.instance.selectAudioInput(device);
    } catch (_) {}
  }

  Future<void> _selectCam(String deviceId) async {
    ref.read(callProvider.notifier).setSelectedCamId(deviceId);
    final track = widget.room?.localParticipant?.videoTrackPublications.firstOrNull?.track;
    if (track is LocalVideoTrack) {
      try {
        await track.switchCamera(deviceId);
      } catch (_) {}
    }
  }

  Future<void> _selectSpeaker(String deviceId) async {
    ref.read(callProvider.notifier).setSelectedSpeakerId(deviceId);
    final device = _speakers.firstWhere(
      (d) => d.deviceId == deviceId,
      orElse: () => _speakers.first,
    );
    try {
      await Hardware.instance.selectAudioOutput(device);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(callProvider);
    return Material(
      color: Colors.transparent,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 360),
            decoration: BoxDecoration(
              color: const Color(0xF20F172A),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              boxShadow: const [
                BoxShadow(color: Color(0xAA000000), blurRadius: 30, offset: Offset(0, 10)),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Call settings',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: widget.onClose,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close_rounded, size: 18, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: Color(0x1AFFFFFF)),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 32),
                    child: SizedBox(
                      width: 24, height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _Section(
                          label: 'Microphone',
                          devices: _mics,
                          selectedId: state.selectedMicId ?? _mics.firstOrNull?.deviceId,
                          onChange: _selectMic,
                        ),
                        const SizedBox(height: 16),
                        _Section(
                          label: 'Camera',
                          devices: _cams,
                          selectedId: state.selectedCamId ?? _cams.firstOrNull?.deviceId,
                          onChange: _selectCam,
                        ),
                        const SizedBox(height: 16),
                        _Section(
                          label: 'Speaker',
                          devices: _speakers,
                          selectedId: state.selectedSpeakerId ?? _speakers.firstOrNull?.deviceId,
                          onChange: _selectSpeaker,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String label;
  final List<MediaDevice> devices;
  final String? selectedId;
  final ValueChanged<String> onChange;
  const _Section({
    required this.label,
    required this.devices,
    required this.selectedId,
    required this.onChange,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: Color(0x99FFFFFF),
            fontSize: 11,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        if (devices.isEmpty)
          const Text(
            'No devices found',
            style: TextStyle(color: Color(0x80FFFFFF), fontStyle: FontStyle.italic, fontSize: 13),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            ),
            child: DropdownButtonHideUnderline(
              child: ButtonTheme(
                alignedDropdown: true,
                child: DropdownButton<String>(
                  value: selectedId,
                  isExpanded: true,
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  icon: const Icon(Icons.arrow_drop_down, color: Colors.white70),
                  items: [
                    for (var i = 0; i < devices.length; i++)
                      DropdownMenuItem(
                        value: devices[i].deviceId,
                        child: Text(
                          devices[i].label.isNotEmpty ? devices[i].label : '$label ${i + 1}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                  onChanged: (v) {
                    if (v != null) onChange(v);
                  },
                ),
              ),
            ),
          ),
      ],
    );
  }
}
