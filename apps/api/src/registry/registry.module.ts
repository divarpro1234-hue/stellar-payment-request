import { Module } from '@nestjs/common';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';
import { SorobanRpcClient } from './soroban-rpc.client';

@Module({
  controllers: [RegistryController],
  providers: [RegistryService, SorobanRpcClient],
})
export class RegistryModule {}
