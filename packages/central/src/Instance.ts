import crypto from 'node:crypto';
import { Controller } from './Controller';
import { InstanceSettings } from './InstanceSettings';

export class Instance {
  readonly controller: Controller;
  readonly id: number;

  readonly settings: InstanceSettings;

  constructor(controller: Controller, id: number) {
    this.controller = controller;
    this.id = id;

    this.settings = new InstanceSettings(this);
  }

  async _request(command: string, args?: any): Promise<{ code: number, data: any } | undefined> {
    if (!this.controller.connected) return;
    const sessionId: string = crypto.randomBytes(16).toString('hex').toUpperCase();
    this.controller.socket!.emit('request instance', sessionId, this.id, command, args);
    return await this.listenForResponse(sessionId);
  }

  private listenForResponse(sessionId: string): Promise<{ code: number, data: any }> {
    return new Promise(resolve => {
      if (!this.controller.connected)
        resolve({ code: 408, data: undefined });
      else this.controller.socket!.once('response instance', async (code: number, _sessionId: string, data: any) =>
        resolve(
          _sessionId === sessionId
            ? { code, data }
            : await this.listenForResponse(sessionId)
        ));
    });
  }

  async _requestData(command: string, args?: any): Promise<any | undefined> {
    const response = await this._request(command, args);
    return !response || response.code !== 200 ? undefined : response.data;
  }
}