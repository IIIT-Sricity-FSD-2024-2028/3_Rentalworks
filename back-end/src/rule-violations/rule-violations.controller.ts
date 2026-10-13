import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RuleViolationsService } from './rule-violations.service';
import {
  CreateRuleViolationDto,
  UpdateRuleViolationDto,
} from './rule-violations.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('rule-violations')
@Controller('rule-violations')
@UseGuards(RolesGuard)
export class RuleViolationsController {
  constructor(
    private readonly ruleViolationsService: RuleViolationsService,
  ) {}

  @Get()
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Get all rule violations' })
  findAll() {
    return this.ruleViolationsService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Get rule violation by ID' })
  findOne(@Param('id') id: string) {
    return this.ruleViolationsService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Create new rule violation' })
  create(@Body() dto: CreateRuleViolationDto) {
    return this.ruleViolationsService.create(dto);
  }

  @Put(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Update rule violation' })
  update(@Param('id') id: string, @Body() dto: UpdateRuleViolationDto) {
    return this.ruleViolationsService.update(+id, dto);
  }

  @Post(':id/warning')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Issue an extra warning for a rule violation' })
  issueWarning(@Param('id') id: string) {
    return this.ruleViolationsService.issueWarning(+id);
  }

  @Post(':id/escalate')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Escalate rule violation to owner' })
  escalate(@Param('id') id: string) {
    return this.ruleViolationsService.escalateToOwner(+id);
  }

  @Delete(':id')
  @Roles('admin', 'warden')
  @ApiOperation({ summary: 'Delete rule violation' })
  remove(@Param('id') id: string) {
    return this.ruleViolationsService.remove(+id);
  }
}
