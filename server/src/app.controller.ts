import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() // This means "handle routes starting from /"
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get() // This means "handle GET requests to /"
  getHello(): string {
    return this.appService.getHello();
  }
}
