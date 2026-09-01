import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { DisplayNameAvailabilityDto } from './dto/display-name-availability.dto';

@ApiTags('users')
@Controller('users')
export class DisplayNameAvailabilityController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Check whether a display name can be used for signup',
  })
  @ApiQuery({ name: 'displayName', required: true, example: 'Kyle M' })
  @Get('display-name/availability')
  async checkAvailability(@Query() query: DisplayNameAvailabilityDto) {
    return {
      ...(await this.usersService.checkDisplayName(query.displayName)),
    };
  }
}
