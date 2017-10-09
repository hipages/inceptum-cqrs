import { suite, test, slow, timeout } from 'mocha-typescript';
import { must } from 'must';
import * as fs from 'fs';
import * as path from 'path';
import { Auth } from '../../../src/auth/Auth';
import { SigningAuthService } from '../../../src/auth/service/SigningAuthService';

const privateKeyPem = fs.readFileSync(path.join(__dirname, 'private.pem'));
const publicKeyPem = fs.readFileSync(path.join(__dirname, 'public.pem'));

suite('auth/service/SigningAuthService', () => {
  suite('Signing', () => {
    test('creates a valid JWT', () => {
      const auth = new Auth('user', 'testUserId', ['user', 'admin'], { 'job:1234': ['creator'] });
      const service = new SigningAuthService({ issuer: 'TestIssuer', privateKeyId: 'test1', privateKeyPem });
      const resp = service.sign(auth);
      const parts = resp.split('.', 3);
      // console.log(resp);
      const headerStr = Buffer.from(parts[0], 'base64').toString();
      const header = JSON.parse(headerStr);
      header.keyid.must.equal('test1');
      // console.log(header);
      const payloadStr = Buffer.from(parts[1], 'base64').toString();
      const payload = JSON.parse(payloadStr);
      payload.sub.must.equal('testUserId');
      payload.subT.must.equal('user');
      payload.iss.must.equal('TestIssuer');
      payload.roles.must.eql(['user', 'admin']);
      payload.extraRoles.must.eql({ 'job:1234': ['creator'] });
    });
    test('Creates a JWT that can be validated', () => {
      const auth = new Auth('user', 'testUserId', ['user', 'admin'], { 'job:1234': ['creator'] });
      const service = new SigningAuthService({ issuer: 'TestIssuer', privateKeyId: 'test1', privateKeyPem, publicKeys: new Map([['test1', publicKeyPem]]) });
      const signed = service.sign(auth);
      const resp = service.validate(signed);
      resp.must.eql(auth);
    });
  });
});
