import { BadRequestException } from "@nestjs/common";

export class AiResponseException extends BadRequestException {
    constructor(reason: string) {
        super(`AI response error: ${reason}`);
    }
}