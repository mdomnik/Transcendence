import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CreateTopicDto, UpdateTopicDto } from './dto';

// Controller endpoints protected by a throttler guard for rate limiting to prevent spam
// and ApiKeyGuard to stop unauthorized public api access
@UseGuards(ThrottlerGuard, ApiKeyGuard)
@Controller('topics')
export class TopicsController {
    constructor(private readonly topicsService: TopicsService) {}

    // Get for Root (/api/topics/)
    @Get()
    findAllTopics() {
        return this.topicsService.findAllTopics();
    }

    // Get for (/api/topics/{id})
    @Get(':id')
    findSpecificTopic(@Param('id') id: string) {
        return this.topicsService.findSpecificTopic(id);
    }

    // Post for (/api/topics/) (body: {"title": titleName})
    @Post()
    createNewTopic(@Body() dto: CreateTopicDto) {
        return this.topicsService.createNewTopic(dto);
    }

    // Put for (/api/topics/{id}) (body: {"title": NewtitleName})
    @Put(':id')
    updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
        return this.topicsService.updateTopic(id, dto);
    }

    // Delete for (/api/topics/{id})
    @Delete(':id')
    removeTopic(@Param('id') id: string) {
        return this.topicsService.removeTopic(id);
    }

}
