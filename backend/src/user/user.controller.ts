import { Controller, Get, UseGuards, Param, Query, Patch, Body, Post, UseInterceptors, BadRequestException, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import { UserService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);


@Controller('users')
export class UserController {
  constructor(private usersService: UserService) {}

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    getMe(@UserDecorator() user: { id: string }) {
        return this.usersService.getMe(user.id);
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'))
    updateMe(@UserDecorator() user: { id: string }, @Body() dto) {
        return this.usersService.updateMe(user.id, dto);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('/me/avatar')
    @UseInterceptors(
        FileInterceptor('avatar', {
          storage: diskStorage({
            destination: 'uploads/avatars',
            filename: (_req, file, cb) => {
              // temporary name; we will rename after we know userId
              const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
              cb(null, `${unique}${extname(file.originalname)}`);
            },
          }),
          limits: { fileSize: MAX_SIZE_BYTES },
          fileFilter: (_req, file, cb) => {
            if (!ALLOWED_MIME.has(file.mimetype)) {
              return cb(new BadRequestException('Invalid file type'), false);
            }
            cb(null, true);
          },
        }),
      )
      async uploadAvatar(
        @UserDecorator('id') id: string,
        @UploadedFile() file?: Express.Multer.File,
      ) {
        if (!file) throw new BadRequestException('Missing avatar file');
        return this.usersService.setAvatarFromUpload(id, file);
      }
      @Get('search')
      searchUsers(
          @Query('query') query: string,
          @UserDecorator('id') id: string,
      ) {
          return this.usersService.searchUsers(query, id);
      }
      
      @Get(':userId')
      getPublicProfile(@Param('userId') userId: string) {
      return this.usersService.getPublicProfile(userId);
    }
  }
    

//   @Get('username/:username')
//   getIdFromUsername(@Param('username') username: string) {
//     return this.usersService.getIdFromUsername(username);
//   }

