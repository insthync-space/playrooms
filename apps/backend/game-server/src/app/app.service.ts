import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() {}
  async getData() {
    return { message: 'Hello API' };
  }
}
