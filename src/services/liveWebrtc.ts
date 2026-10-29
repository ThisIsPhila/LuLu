type IceGatheringPeer = Pick<RTCPeerConnection, 'iceGatheringState'|'localDescription'|'addEventListener'|'removeEventListener'>;

/** Wait for non-trickle ICE gathering before sending an SDP offer to GPT-Live. */
export function waitForLocalIceSdp(peer: IceGatheringPeer, timeoutMs = 15_000): Promise<string> {
  return new Promise((resolve,reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>|undefined;
    const cleanup = () => {
      peer.removeEventListener('icegatheringstatechange', onStateChange);
      if (timer !== undefined) clearTimeout(timer);
    };
    const fail = (message:string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };
    const onStateChange = () => {
      if (peer.iceGatheringState !== 'complete' || settled) return;
      const sdp = peer.localDescription?.sdp;
      if (!sdp?.trim()) {
        fail('The microphone connection did not produce a complete network description.');
        return;
      }
      settled = true;
      cleanup();
      resolve(sdp);
    };

    if (peer.iceGatheringState === 'complete') {
      onStateChange();
      return;
    }
    peer.addEventListener('icegatheringstatechange', onStateChange);
    timer = setTimeout(() => fail('The microphone connection timed out while preparing live voice. Check your connection and try again.'), timeoutMs);
    // Recheck after registering to cover completion between the initial state
    // read and listener registration.
    onStateChange();
  });
}
