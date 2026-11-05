import { KeyHelper } from 'libsignal';

export class SignalProtocolStore {
  private store: any = {
    identityKey: null,
    registrationId: null,
    sessions: {},
    preKeys: {},
    signedPreKeys: {},
  };

  async getIdentityKeyPair() {
    return this.store.identityKey;
  }

  async getLocalRegistrationId() {
    return this.store.registrationId;
  }

  async saveIdentity(identifier: string, identityKey: ArrayBuffer) {
    this.store.identityKey = identityKey;
  }

  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, direction: any) {
    return true; // Simplified for now
  }

  async loadSession(identifier: string) {
    return this.store.sessions[identifier] || null;
  }

  async saveSession(identifier: string, session: any) {
    this.store.sessions[identifier] = session;
  }

  async loadPreKey(keyId: string) {
    return this.store.preKeys[keyId] || null;
  }

  async savePreKey(keyId: string, keyPair: any) {
    this.store.preKeys[keyId] = keyPair;
  }

  async loadSignedPreKey(keyId: string) {
    return this.store.signedPreKeys[keyId] || null;
  }

  async saveSignedPreKey(keyId: string, keyPair: any) {
    this.store.signedPreKeys[keyId] = keyPair;
  }
}
