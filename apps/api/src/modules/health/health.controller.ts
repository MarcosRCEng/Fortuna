import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiProperty, ApiTags } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";

  @ApiProperty({ example: "fortuna-api" })
  service!: "fortuna-api";
}

@ApiTags("health")
@Controller(["health", "api/v1/health"])
export class HealthController {
  @Get()
  @ApiOkResponse({ description: "API health status.", type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return {
      status: "ok",
      service: "fortuna-api",
    };
  }
}
