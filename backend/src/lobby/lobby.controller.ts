import { Controller, Post, Get, Param, Body, Delete } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { LobbyDto, LobbyKickDto } from './dto';
import { LobbyReadyDto } from './dto/lobby-ready.dto';

@Controller('lobby')
export class LobbyController {
    constructor(private readonly lobby: LobbyService) {}

    @Post()
    async create(@Body() body: LobbyDto) {
        return this.lobby.createLobby(body.id);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.lobby.getLobby(id);
    }

    @Post(':id/join')
    async join(@Param('id') id: string, @Body() body: LobbyDto) {
        return this.lobby.joinLobby(id, body.id);
    }

    @Post(':id/ready')
    async ready(@Param('id') id: string, @Body() body: LobbyReadyDto) {
        return this.lobby.setReady(id, body.id, body.ready); 
    }

    @Post(':id/start-setup')
    async startSetup(@Param('id') id: string, @Body() body: LobbyDto) {
        return this.lobby.startSetup(id, body.id);
    }

    @Post(':id/leave')
    async leave(@Param('id') id: string, @Body() body: LobbyDto) {
        return this.lobby.leaveLobby(id, body.id);
    }

    @Post(':id/kick')
    async kick(@Param('id') id: string, @Body() body: LobbyKickDto) {
        return this.lobby.kickPlayer(id, body.ownerId, body.targetId);
    }

    @Delete(':id')
    async removeLobby(@Param('id') id: string) {
        return this.lobby.destroyLobby(id);
    }
}
