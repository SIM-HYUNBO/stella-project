// lib/rtcClient.ts
export function createRtcConnection(
  socket: WebSocket,
  onRemoteStream: (stream: MediaStream) => void
) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.ontrack = (e) => {
    onRemoteStream(e.streams[0]);
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.send(
        JSON.stringify({
          type: "ice",
          candidate: e.candidate,
        })
      );
    }
  };

  return pc;
}
