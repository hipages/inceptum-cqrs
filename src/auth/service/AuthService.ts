import * as jwt from 'jsonwebtoken';
import { Auth } from '../Auth';

export interface AuthServiceOptions {
  publicKeys?: Map<string, string>,
}

export class AuthService {
  publicKeys: Map<string, string>;

  constructor(options: AuthServiceOptions) {
    this.publicKeys = options.publicKeys || new Map<string, string>();
  }
  registerPublicKey(keyId: string, publicKeyPem: string): void {
    this.publicKeys.set(keyId, publicKeyPem);
  }
  removePublicKey(keyId): void {
    this.publicKeys.delete(keyId);
  }
  /**
   * Validates a signed Auth
   * @param {string} signed the signed auth to validate
   */
  validate(signed: string): Auth {
    const headerEncoded = signed.substr(0, signed.indexOf('.'));
    const headerStr = Buffer.from(headerEncoded, 'base64').toString();
    const header = JSON.parse(headerStr);
    if (!header.keyid) {
      throw new Error('The JWT doesn\'t contain a key id. Can\'t validate');
    }
    const keyId = header.keyid;
    if (!this.publicKeys.has(keyId)) {
      throw new Error(`Unknown key id ${keyId}. Token is not valid`);
    }
    const publicKey = this.publicKeys.get(keyId);
    const verified: any = jwt.verify(signed, publicKey);
    return new Auth(verified.subT, verified.sub, verified.roles, verified.extraRoles);
  }
}
