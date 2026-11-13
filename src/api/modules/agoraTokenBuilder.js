/**
 * Pure-JavaScript implementation of Agora RTC v006 AccessToken / RtcTokenBuilder.
 * Operates in browser environments using the Web Crypto API (crypto.subtle).
 * Generates byte-for-byte identical tokens to Agora's official SDK and pure-Python builder.
 */

function makeCrcTable() {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

export function crc32(bytes) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

class ByteBuf {
  constructor() {
    this.buffer = [];
  }

  putUint16(v) {
    this.buffer.push(v & 0xFF, (v >> 8) & 0xFF);
    return this;
  }

  putUint32(v) {
    this.buffer.push(
      v & 0xFF,
      (v >> 8) & 0xFF,
      (v >> 16) & 0xFF,
      (v >>> 24) & 0xFF
    );
    return this;
  }

  putBytes(b) {
    if (typeof b === 'string') {
      b = new TextEncoder().encode(b);
    }
    this.putUint16(b.length);
    for (let i = 0; i < b.length; i++) {
      this.buffer.push(b[i]);
    }
    return this;
  }

  putIntMap(map) {
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    this.putUint16(keys.length);
    for (const k of keys) {
      this.putUint16(k);
      this.putUint32(map[k]);
    }
    return this;
  }

  getBytes() {
    return new Uint8Array(this.buffer);
  }
}

export const DEFAULT_AGORA_APP_ID = '677b5c452b3f4408b8d481eebd8a0e36';
export const DEFAULT_AGORA_APP_CERTIFICATE = '7941b76199ed47cf98cc0f80e3d606ea';

/**
 * Builds an Agora RTC Token (v006) for a given channel and numeric/string UID.
 *
 * @param {string} appId - Agora App ID
 * @param {string} appCertificate - Agora App Certificate
 * @param {string} channelName - Name of the Agora RTC channel
 * @param {number|string} uid - User ID
 * @param {number} expireSeconds - Validity in seconds (default 24 hours)
 * @returns {Promise<string>} Agora AccessToken v006 string
 */
export async function buildAgoraToken(
  appId = DEFAULT_AGORA_APP_ID,
  appCertificate = DEFAULT_AGORA_APP_CERTIFICATE,
  channelName,
  uid = 0,
  expireSeconds = 86400
) {
  if (!appId) return '';
  if (!appCertificate) return '';

  const now = Math.floor(Date.now() / 1000);
  const expireTs = now + expireSeconds;
  const salt = Math.floor(Math.random() * 99999999) + 1;

  // Privileges: 1=JoinChannel, 2=PublishAudioStream, 3=PublishVideoStream, 4=PublishDataStream
  const privileges = {
    1: expireTs,
    2: expireTs,
    3: expireTs,
    4: expireTs,
  };

  const pBuf = new ByteBuf();
  pBuf.putUint32(salt);
  pBuf.putUint32(expireTs);
  pBuf.putIntMap(privileges);
  const messageRaw = pBuf.getBytes();

  const uidStr = (uid !== 0 && uid !== undefined && uid !== null) ? String(uid) : '';
  const encoder = new TextEncoder();
  const appIdBytes = encoder.encode(appId);
  const channelBytes = encoder.encode(channelName);
  const uidBytes = encoder.encode(uidStr);

  const totalLen = appIdBytes.length + channelBytes.length + uidBytes.length + messageRaw.length;
  const dataToSign = new Uint8Array(totalLen);
  let offset = 0;
  dataToSign.set(appIdBytes, offset); offset += appIdBytes.length;
  dataToSign.set(channelBytes, offset); offset += channelBytes.length;
  dataToSign.set(uidBytes, offset); offset += uidBytes.length;
  dataToSign.set(messageRaw, offset);

  // HMAC-SHA256 signature using browser Web Crypto API
  const key = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(appCertificate),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await window.crypto.subtle.sign('HMAC', key, dataToSign);
  const signature = new Uint8Array(sigBuffer);

  const crcChannel = crc32(channelBytes);
  const crcUid = uidStr ? crc32(uidBytes) : 0;

  const cBuf = new ByteBuf();
  cBuf.putBytes(signature);
  cBuf.putUint32(crcChannel);
  cBuf.putUint32(crcUid);
  cBuf.putBytes(messageRaw);
  const contentBytes = cBuf.getBytes();

  let binary = '';
  for (let i = 0; i < contentBytes.length; i++) {
    binary += String.fromCharCode(contentBytes[i]);
  }
  const b64 = btoa(binary);
  return `006${appId}${b64}`;
}
