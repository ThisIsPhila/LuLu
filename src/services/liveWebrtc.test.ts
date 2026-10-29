import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { waitForLocalIceSdp } from './liveWebrtc.ts';

class FakePeer extends EventTarget {
  iceGatheringState: RTCIceGatheringState = 'gathering';
  localDescription: RTCSessionDescription|null = {type:'offer',sdp:'offer-with-ice-candidates'} as RTCSessionDescription;
  complete() {
    this.iceGatheringState = 'complete';
    this.dispatchEvent(new Event('icegatheringstatechange'));
  }
}

test('waits for ICE candidates and returns the completed local SDP',async()=>{
  const peer = new FakePeer();
  const pending = waitForLocalIceSdp(peer,100);
  peer.localDescription = {type:'offer',sdp:'completed-offer-with-candidates'} as RTCSessionDescription;
  peer.complete();
  assert.equal(await pending,'completed-offer-with-candidates');
});

test('fails clearly when ICE gathering times out or completes without an SDP',async()=>{
  await assert.rejects(waitForLocalIceSdp(new FakePeer(),1),/timed out while preparing live voice/);
  const peer = new FakePeer();
  peer.localDescription = null;
  const pending = waitForLocalIceSdp(peer,100);
  peer.complete();
  await assert.rejects(pending,/did not produce a complete network description/);
});
