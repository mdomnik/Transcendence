import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from "class-validator";


export class QuestionDto {
    @IsString()
    question: string;

    @IsString()
    answer1: string;
    @IsString()
    answer2: string;
    @IsString()
    answer3: string;
    @IsString()
    answer4: string;

    @IsInt()
    @Min(1)
    @Max(4)
    c_answer: number;
}