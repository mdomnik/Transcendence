import { IsNotEmpty, IsString } from "class-validator";

// simple update topic dto
export class UpdateTopicDto {
    @IsString()
    @IsNotEmpty()
    title: string;
}