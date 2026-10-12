import type { CallSignal, VideoCall } from "@/lib/video-call";
import { waitForIce } from "@/lib/video-call-client";

type Peer = { pc: RTCPeerConnection; busy: boolean; failed: boolean; sent: boolean; timer?: ReturnType<typeof setTimeout>; disconnect?: ReturnType<typeof setTimeout> };
/** One media connection per pair; a new guest does not renegotiate existing pairs. */
export class CallMesh {
  private peers = new Map<string, Peer>();
  private closed = false;
  constructor(private uid: string, private stream: MediaStream, private iceServers: RTCIceServer[],
    private send: (peerUid: string, type: "offer" | "answer", description: RTCSessionDescriptionInit) => Promise<unknown>,
    private onStream: (uid: string, stream: MediaStream | null) => void,
    private onStatus: (uid: string, connected: boolean) => void,
    private onError: (uid: string) => void) {}

  sync(call: VideoCall) {
    if (this.closed) return;
    const others = call.members.filter(m => m.uid !== this.uid && m.state === "joined");
    this.peers.forEach((peer, uid) => { if (!others.some(m => m.uid === uid)) this.remove(uid, peer); });
    for (const member of others) {
      const signal = call.signals.find(s => (s.fromUid === this.uid && s.toUid === member.uid) || (s.toUid === this.uid && s.fromUid === member.uid));
      const offering = this.uid < member.uid;
      let peer = this.peers.get(member.uid);
      if (!peer && (offering || signal?.offer)) {
        peer = this.create(member.uid);
        this.peers.set(member.uid, peer);
      }
      if (peer && !peer.busy && !peer.failed) void this.negotiate(member.uid, peer, signal);
    }
  }
  private create(uid: string): Peer {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: Peer = { pc, busy: false, failed: false, sent: false };
    this.stream.getTracks().forEach(track => pc.addTrack(track, this.stream));
    const remote = new MediaStream();
    pc.ontrack = event => {
      if (this.closed || peer.failed) return;
      if (!remote.getTracks().includes(event.track)) remote.addTrack(event.track);
      this.onStream(uid, event.streams[0] || remote);
    };
    pc.onconnectionstatechange = () => {
      if (this.closed || peer.failed) return;
      if (pc.connectionState === "connected") {
        clearTimeout(peer.timer); clearTimeout(peer.disconnect);
        this.onStatus(uid, true);
      } else if (pc.connectionState === "failed") this.fail(uid, peer);
      else if (pc.connectionState === "disconnected") {
        this.onStatus(uid, false); clearTimeout(peer.disconnect);
        peer.disconnect = setTimeout(() => this.fail(uid, peer), 15000);
      }
    };
    peer.timer = setTimeout(() => { if (pc.connectionState !== "connected") this.fail(uid, peer); }, 45000);
    return peer;
  }
  private async negotiate(uid: string, peer: Peer, signal?: CallSignal) {
    peer.busy = true;
    try {
      const offering = this.uid < uid;
      if (!peer.sent) {
        if (offering) await peer.pc.setLocalDescription(await peer.pc.createOffer());
        else {
          if (!signal?.offer) return;
          await peer.pc.setRemoteDescription(signal.offer);
          await peer.pc.setLocalDescription(await peer.pc.createAnswer());
        }
        await waitForIce(peer.pc);
        if (this.closed || peer.failed || !this.peers.has(uid)) return;
        await this.send(uid, offering ? "offer" : "answer", peer.pc.localDescription!.toJSON());
        peer.sent = true;
      }
      if (!this.closed && !peer.failed && offering && signal?.answer && !peer.pc.remoteDescription) await peer.pc.setRemoteDescription(signal.answer);
    } catch { if (!this.closed && this.peers.has(uid)) this.fail(uid, peer); }
    finally { peer.busy = false; }
  }
  private fail(uid: string, peer: Peer) {
    if (peer.failed || this.closed) return;
    peer.failed = true;
    this.release(peer); this.onStream(uid, null); this.onStatus(uid, false); this.onError(uid);
  }
  private release(peer: Peer) {
    clearTimeout(peer.timer); clearTimeout(peer.disconnect);
    peer.pc.ontrack = null; peer.pc.onconnectionstatechange = null; peer.pc.close();
  }
  private remove(uid: string, peer: Peer) {
    peer.failed = true;
    this.release(peer); this.peers.delete(uid); this.onStream(uid, null); this.onStatus(uid, false);
  }
  close() {
    this.closed = true;
    this.peers.forEach(peer => this.release(peer)); this.peers.clear();
  }
}
