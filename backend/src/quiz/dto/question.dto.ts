import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from "class-validator";


export class QuestionDto {
    @IsString()
    question: string;

    @IsString()
    answer_1: string;
    @IsString()
    answer_2: string;
    @IsString()
    answer_3: string;
    @IsString()
    answer_4: string;

    @IsInt()
    @Min(1)
    @Max(4)
    answer_c: number;

    @IsString()
    @MaxLength(12)
    subject_icon: string;
}