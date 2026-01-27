import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from "class-validator";

// TOPIC DTO
export class TopicDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    topic: string;

    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    @Max(10)
    @Min(1)
    qnum: number;

    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    @Max(3)
    @Min(1)
    difficulty: number;
}