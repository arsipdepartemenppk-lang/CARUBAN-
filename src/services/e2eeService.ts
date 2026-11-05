import { SignalProtocolStore } from './signalStore';
import { KeyHelper, SessionBuilder, SessionCipher } from 'libsignal';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export class E2EEService {
  private static instance: E2EEService;
  private store = new SignalProtocolStore();

  private constructor() {}

  static getInstance(): E2EEService {
    if (!E2EEService.instance) {
      E2EEService.instance = new E2EEService();
    }
    return E2EEService.instance;
  }

  async init(userId: string) {
    const identityDoc = await getDoc(doc(db, 'users', userId, 'e2ee_keys', 'identity'));
    if (identityDoc.exists()) {
      const keys = identityDoc.data();
      const identityKeyArray = new Uint8Array(keys.identityKey);
      await this.store.saveIdentity('identity', identityKeyArray.buffer.slice(identityKeyArray.byteOffset, identityKeyArray.byteOffset + identityKeyArray.byteLength));
      console.log('E2EE keys loaded for:', userId);
    } else {
      await this.generateKeys(userId);
    }
  }

  async generateKeys(userId: string) {
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    const registrationId = KeyHelper.generateRegistrationId();
    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
    const preKeys = await KeyHelper.generatePreKeys(1, 100);

    await this.store.saveIdentity('identity', identityKeyPair.pubKey);
    await this.store.saveSignedPreKey('1', signedPreKey);
    for (const preKey of preKeys) {
      await this.store.savePreKey(preKey.keyId.toString(), preKey);
    }

    await setDoc(doc(db, 'users', userId, 'e2ee_keys', 'identity'), {
      identityKey: Array.from(new Uint8Array(identityKeyPair.pubKey)),
      registrationId,
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: Array.from(new Uint8Array(signedPreKey.keyPair.pubKey)),
        signature: Array.from(new Uint8Array(signedPreKey.signature))
      },
      preKeys: preKeys.map(pk => ({
        keyId: pk.keyId,
        publicKey: Array.from(new Uint8Array(pk.keyPair.pubKey))
      }))
    });

    console.log('Kunci E2EE berhasil dibuat untuk:', userId);
  }

  async establishSession(recipientId: string) {
    const recipientDoc = await getDoc(doc(db, 'users', recipientId, 'e2ee_keys', 'identity'));
    if (!recipientDoc.exists()) {
      throw new Error('Recipient keys not found');
    }
    const keys = recipientDoc.data();

    const identityKey = new Uint8Array(keys.identityKey);
    const signedPreKey = {
      keyId: keys.signedPreKey.keyId,
      keyPair: {
        pubKey: new Uint8Array(keys.signedPreKey.publicKey)
      },
      signature: new Uint8Array(keys.signedPreKey.signature)
    };
    const preKey = {
      keyId: keys.preKeys[0].keyId,
      keyPair: {
        pubKey: new Uint8Array(keys.preKeys[0].publicKey)
      }
    };

    const builder = new SessionBuilder(this.store, recipientId);
    await builder.processPreKey({
      identityKey,
      signedPreKey,
      preKey
    });

    console.log('Session established with:', recipientId);
  }

  async encryptMessage(message: string, recipientId: string): Promise<string> {
    const session = await this.store.loadSession(recipientId);
    if (!session) {
      await this.establishSession(recipientId);
    }
    const cipher = new SessionCipher(this.store, recipientId);
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    const encrypted = await cipher.encrypt(messageBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(encrypted.body)));
  }

  async decryptMessage(encryptedMessage: string, senderId: string): Promise<string> {
    try {
      const cipher = new SessionCipher(this.store, senderId);
      const encryptedBuffer = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
      const decrypted = await cipher.decrypt(encryptedBuffer.buffer);
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (e) {
      console.error('Decryption failed:', e);
      return 'Pesan terenkripsi tidak dapat dibaca';
    }
  }
}
