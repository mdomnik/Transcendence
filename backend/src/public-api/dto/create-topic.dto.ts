import { IsNotEmpty, IsString } from "class-validator";

// simple create topic dto
export class CreateTopicDto {
    @IsString()
    @IsNotEmpty()
    title: string;
}